use anyhow::Result;
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rumqttc::{AsyncClient, Event, MqttOptions, Packet, QoS};
use serde_json::Value;
use std::sync::Arc;
use std::time::Duration;
use tracing::{debug, error, info, warn};

use greyhook_edge::{
    config::Config,
    routing::{classify_topic, event_type_str, kafka_topic_for_event, machine_id_key, TopicKind},
};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let config = Arc::new(Config::from_env()?);

    info!(
        mqtt = %format!("{}:{}", config.mqtt_host, config.mqtt_port),
        kafka = %config.kafka_brokers,
        gateway_id = %config.gateway_id,
        "GreyHook edge gateway starting"
    );

    let producer: Arc<FutureProducer> = Arc::new(
        ClientConfig::new()
            .set("bootstrap.servers", &config.kafka_brokers)
            .set("message.timeout.ms", "10000")
            .set("queue.buffering.max.ms", "50")
            .set("retries", "3")
            .create()?,
    );

    run_bridge(config, producer).await;
    Ok(())
}

async fn run_bridge(config: Arc<Config>, producer: Arc<FutureProducer>) {
    let mut backoff = Duration::from_secs(1);
    let max_backoff = Duration::from_secs(60);

    loop {
        let client_id = format!(
            "greyhook-edge-{}",
            uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("0")
        );
        let mut opts = MqttOptions::new(&client_id, &config.mqtt_host, config.mqtt_port);
        opts.set_keep_alive(Duration::from_secs(30));
        opts.set_clean_session(true);

        let (client, mut eventloop) = AsyncClient::new(opts, 128);

        info!(mqtt_host=%config.mqtt_host, mqtt_port=%config.mqtt_port, "Connecting to MQTT broker");

        loop {
            match eventloop.poll().await {
                Ok(Event::Incoming(Packet::ConnAck(_))) => {
                    info!("MQTT connected — subscribing to factory/#");
                    backoff = Duration::from_secs(1);
                    if let Err(e) = client.subscribe("factory/#", QoS::AtLeastOnce).await {
                        warn!(error = %e, "MQTT subscribe failed");
                    }
                }
                Ok(Event::Incoming(Packet::Publish(publish))) => {
                    handle_publish(
                        &publish.topic,
                        &publish.payload[..],
                        &producer,
                        &config,
                    )
                    .await;
                }
                Ok(Event::Incoming(Packet::Disconnect)) => {
                    warn!("MQTT server sent disconnect");
                    break;
                }
                Ok(_) => {}
                Err(e) => {
                    error!(
                        error = %e,
                        backoff_secs = backoff.as_secs(),
                        "MQTT connection error — backing off"
                    );
                    tokio::time::sleep(backoff).await;
                    backoff = (backoff * 2).min(max_backoff);
                    break;
                }
            }
        }
    }
}

async fn handle_publish(
    topic: &str,
    raw: &[u8],
    producer: &FutureProducer,
    config: &Config,
) {
    let payload_str = match std::str::from_utf8(raw) {
        Ok(s) => s,
        Err(e) => {
            warn!(topic, error = %e, "Non-UTF-8 MQTT payload, skipping");
            return;
        }
    };

    let json: Value = match serde_json::from_str(payload_str) {
        Ok(v) => v,
        Err(e) => {
            warn!(topic, error = %e, "Invalid JSON in MQTT payload, skipping");
            return;
        }
    };

    let (kafka_topic, partition_key) = match classify_topic(topic) {
        TopicKind::Telemetry => ("mes.telemetry.raw", machine_id_key(&json)),
        TopicKind::Event => {
            let et = event_type_str(&json);
            (kafka_topic_for_event(et), machine_id_key(&json))
        }
        TopicKind::Unknown => {
            debug!(topic, "Ignoring unknown MQTT topic");
            return;
        }
    };

    let record = FutureRecord::to(kafka_topic)
        .key(&partition_key)
        .payload(payload_str);

    match producer.send(record, Duration::from_secs(5)).await {
        Ok((partition, offset)) => {
            debug!(
                mqtt_topic = topic,
                kafka_topic,
                machine_id = partition_key,
                partition,
                offset,
                "Message forwarded to Kafka"
            );
        }
        Err((e, _)) => {
            warn!(
                mqtt_topic = topic,
                kafka_topic,
                machine_id = partition_key,
                error = %e,
                "Kafka send failed"
            );
        }
    }
}
