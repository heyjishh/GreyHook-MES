mod config;
mod machine;
mod publisher;
mod scenario;

use anyhow::Result;
use chrono::{Duration as ChronoDuration, NaiveTime, TimeZone, Utc};
use machine::{Machine, MachineState};
use publisher::{
    new_uuid, DowntimeEvent, KafkaPublisher, MqttPublisher, ProductionEvent, TelemetryPayload,
    TelemetryRaw,
};
use scenario::DemoScenario;
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tracing::{info, warn};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let cfg = config::load()?;

    info!(
        org_id = %cfg.org_id,
        factory_id = %cfg.factory_id,
        speed_factor = cfg.speed_factor,
        kafka = %cfg.kafka_bootstrap_servers,
        mqtt = %format!("{}:{}", cfg.mqtt_host, cfg.mqtt_port),
        "GreyHook factory simulator starting"
    );

    // Shift starts at 06:00 IST = 00:30 UTC
    let now_utc = Utc::now();
    let today = now_utc.date_naive();
    let shift_naive = today
        .and_time(NaiveTime::from_hms_opt(0, 30, 0).unwrap());
    let shift_start_sim = Utc.from_utc_datetime(&shift_naive);

    info!(shift_start_utc = %shift_start_sim, "Shift window initialised");

    let mut machines: Vec<Machine> = cfg
        .machines
        .iter()
        .map(|mc| {
            Machine::new(
                mc.id.clone(),
                mc.name.clone(),
                mc.machine_type.clone(),
                mc.ideal_cycle_time_seconds,
                mc.order_id.clone(),
                shift_start_sim,
            )
        })
        .collect();

    let mut scenario = DemoScenario::new(shift_start_sim);

    let kafka = KafkaPublisher::new(&cfg.kafka_bootstrap_servers)?;
    let mqtt = MqttPublisher::new(&cfg.mqtt_host, cfg.mqtt_port, "greyhook-simulator").await?;

    let mut active_downtimes: HashMap<String, String> = HashMap::new();

    let wall_start = Instant::now();
    let tick_real_secs = 5.0_f64;
    let sim_secs_per_tick = tick_real_secs * cfg.speed_factor;
    let mut interval = tokio::time::interval(Duration::from_secs_f64(tick_real_secs));

    info!(
        tick_real_s = tick_real_secs,
        sim_s_per_tick = sim_secs_per_tick,
        "Simulator loop started"
    );

    loop {
        interval.tick().await;

        let wall_elapsed = wall_start.elapsed().as_secs_f64();
        let sim_elapsed = wall_elapsed * cfg.speed_factor;
        let sim_time = shift_start_sim
            + ChronoDuration::milliseconds((sim_elapsed * 1000.0) as i64);

        // --- downtime events that should start ---
        for event in scenario.poll_events_to_start(sim_time) {
            if let Some(machine) = machines.iter_mut().find(|m| m.id == event.machine_id) {
                if machine.transition(event.state_during.clone(), sim_time) {
                    let dt_id = new_uuid();
                    active_downtimes.insert(machine.id.clone(), dt_id.clone());

                    info!(
                        machine_id = %machine.id,
                        category = %event.category_code,
                        state = %event.state_during,
                        description = %event.description,
                        "Downtime opened"
                    );

                    let dt_ev = DowntimeEvent {
                        event_id: new_uuid(),
                        organization_id: cfg.org_id.clone(),
                        machine_id: machine.id.clone(),
                        downtime_event_id: dt_id,
                        event_time: sim_time,
                        event_type: "downtime_opened".to_string(),
                        category_code: Some(event.category_code.clone()),
                        duration_seconds: None,
                    };
                    publish_to_kafka(&kafka, "mes.downtime.events", &machine.id, &dt_ev).await;

                    let prod_ev = ProductionEvent {
                        event_id: new_uuid(),
                        organization_id: cfg.org_id.clone(),
                        order_id: machine.order_id.clone(),
                        machine_id: machine.id.clone(),
                        event_time: sim_time,
                        event_type: "order_paused".to_string(),
                        quantity_delta: 0,
                        cumulative_qty: machine.counter_total,
                    };
                    publish_to_kafka(&kafka, "mes.production.events", &machine.id, &prod_ev).await;
                }
            }
        }

        // --- downtime events that should end ---
        for event in scenario.poll_events_to_end(sim_time) {
            if let Some(machine) = machines.iter_mut().find(|m| m.id == event.machine_id) {
                let next_state = if scenario.is_shift_active(sim_time) {
                    MachineState::Running
                } else {
                    MachineState::Idle
                };
                if machine.transition(next_state, sim_time) {
                    let dt_id = active_downtimes
                        .remove(&machine.id)
                        .unwrap_or_else(new_uuid);

                    info!(
                        machine_id = %machine.id,
                        category = %event.category_code,
                        duration_s = event.duration_seconds,
                        "Downtime closed"
                    );

                    let dt_ev = DowntimeEvent {
                        event_id: new_uuid(),
                        organization_id: cfg.org_id.clone(),
                        machine_id: machine.id.clone(),
                        downtime_event_id: dt_id,
                        event_time: sim_time,
                        event_type: "downtime_closed".to_string(),
                        category_code: Some(event.category_code.clone()),
                        duration_seconds: Some(event.duration_seconds),
                    };
                    publish_to_kafka(&kafka, "mes.downtime.events", &machine.id, &dt_ev).await;

                    let prod_ev = ProductionEvent {
                        event_id: new_uuid(),
                        organization_id: cfg.org_id.clone(),
                        order_id: machine.order_id.clone(),
                        machine_id: machine.id.clone(),
                        event_time: sim_time,
                        event_type: "order_started".to_string(),
                        quantity_delta: 0,
                        cumulative_qty: machine.counter_total,
                    };
                    publish_to_kafka(&kafka, "mes.production.events", &machine.id, &prod_ev).await;
                }
            }
        }

        // --- shift start / end transitions ---
        let shift_active = scenario.is_shift_active(sim_time);
        for machine in &mut machines {
            if shift_active
                && machine.state == MachineState::Idle
                && !active_downtimes.contains_key(&machine.id)
            {
                if machine.transition(MachineState::Running, sim_time) {
                    info!(machine_id = %machine.id, "Machine started running");

                    let prod_ev = ProductionEvent {
                        event_id: new_uuid(),
                        organization_id: cfg.org_id.clone(),
                        order_id: machine.order_id.clone(),
                        machine_id: machine.id.clone(),
                        event_time: sim_time,
                        event_type: "order_started".to_string(),
                        quantity_delta: 0,
                        cumulative_qty: 0,
                    };
                    publish_to_kafka(&kafka, "mes.production.events", &machine.id, &prod_ev).await;
                }
            } else if !shift_active && machine.state == MachineState::Running {
                if machine.transition(MachineState::Offline, sim_time) {
                    info!(machine_id = %machine.id, "Machine offline — shift ended");

                    let prod_ev = ProductionEvent {
                        event_id: new_uuid(),
                        organization_id: cfg.org_id.clone(),
                        order_id: machine.order_id.clone(),
                        machine_id: machine.id.clone(),
                        event_time: sim_time,
                        event_type: "order_completed".to_string(),
                        quantity_delta: 0,
                        cumulative_qty: machine.counter_total,
                    };
                    publish_to_kafka(&kafka, "mes.production.events", &machine.id, &prod_ev).await;
                }
            }
        }

        // --- advance counters + publish telemetry ---
        for machine in &mut machines {
            let units_added = machine.advance(sim_secs_per_tick);

            if units_added > 0 {
                let prod_ev = ProductionEvent {
                    event_id: new_uuid(),
                    organization_id: cfg.org_id.clone(),
                    order_id: machine.order_id.clone(),
                    machine_id: machine.id.clone(),
                    event_time: sim_time,
                    event_type: "count_increment".to_string(),
                    quantity_delta: units_added,
                    cumulative_qty: machine.counter_total,
                };
                publish_to_kafka(&kafka, "mes.production.events", &machine.id, &prod_ev).await;
            }

            let telemetry = TelemetryRaw {
                event_id: new_uuid(),
                machine_id: machine.id.clone(),
                organization_id: cfg.org_id.clone(),
                event_time: sim_time,
                source_timestamp: sim_time,
                gateway_id: cfg.gateway_id.clone(),
                event_type: "machine_telemetry".to_string(),
                payload: TelemetryPayload {
                    state: machine.state.to_string(),
                    counter_total: machine.counter_total,
                    counter_good: machine.counter_good,
                    ideal_cycle_time_s: machine.ideal_cycle_time_seconds,
                },
                source_seq: machine.source_seq,
            };

            let Ok(json) = serde_json::to_string(&telemetry) else {
                warn!(machine_id = %machine.id, "Failed to serialise telemetry");
                continue;
            };

            if let Err(e) = kafka.publish("mes.telemetry.raw", &machine.id, &json).await {
                warn!(machine_id = %machine.id, error = %e, "Kafka telemetry publish failed");
            }

            let mqtt_topic = format!("factory/{}/telemetry", machine.id);
            if let Err(e) = mqtt.publish(&mqtt_topic, &json).await {
                warn!(machine_id = %machine.id, error = %e, "MQTT telemetry publish failed");
            }

            info!(
                machine_id = %machine.id,
                state = %machine.state,
                counter_total = machine.counter_total,
                counter_good = machine.counter_good,
                units_added,
                sim_time = %sim_time,
                "Telemetry tick"
            );
        }
    }
}

async fn publish_to_kafka<T: serde::Serialize>(
    kafka: &KafkaPublisher,
    topic: &str,
    key: &str,
    payload: &T,
) {
    match serde_json::to_string(payload) {
        Ok(json) => {
            if let Err(e) = kafka.publish(topic, key, &json).await {
                warn!(topic, key, error = %e, "Kafka publish failed");
            }
        }
        Err(e) => warn!(topic, key, error = %e, "Serialisation failed"),
    }
}
