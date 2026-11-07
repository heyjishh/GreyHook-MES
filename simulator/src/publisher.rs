use anyhow::Result;
use chrono::{DateTime, Utc};
use rdkafka::config::ClientConfig;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rumqttc::{AsyncClient, MqttOptions, QoS};
use serde::Serialize;
use std::time::Duration;
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct TelemetryPayload {
    pub state: String,
    pub counter_total: u64,
    pub counter_good: u64,
    pub ideal_cycle_time_s: f64,
}

#[derive(Debug, Serialize)]
pub struct TelemetryRaw {
    pub event_id: String,
    pub machine_id: String,
    pub organization_id: String,
    pub event_time: DateTime<Utc>,
    pub source_timestamp: DateTime<Utc>,
    pub gateway_id: String,
    pub event_type: String,
    pub payload: TelemetryPayload,
    pub source_seq: u64,
}

#[derive(Debug, Serialize)]
pub struct ProductionEvent {
    pub event_id: String,
    pub organization_id: String,
    pub order_id: String,
    pub machine_id: String,
    pub event_time: DateTime<Utc>,
    pub event_type: String,
    pub quantity_delta: u64,
    pub cumulative_qty: u64,
}

#[derive(Debug, Serialize)]
pub struct DowntimeEvent {
    pub event_id: String,
    pub organization_id: String,
    pub machine_id: String,
    pub downtime_event_id: String,
    pub event_time: DateTime<Utc>,
    pub event_type: String,
    pub category_code: Option<String>,
    pub duration_seconds: Option<f64>,
}

pub fn new_uuid() -> String {
    Uuid::new_v4().to_string()
}

pub struct KafkaPublisher {
    producer: FutureProducer,
}

impl KafkaPublisher {
    pub fn new(bootstrap_servers: &str) -> Result<Self> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", bootstrap_servers)
            .set("message.timeout.ms", "5000")
            .set("queue.buffering.max.ms", "100")
            .create()?;
        Ok(Self { producer })
    }

    pub async fn publish(&self, topic: &str, key: &str, payload: &str) -> Result<()> {
        let record = FutureRecord::to(topic).key(key).payload(payload);
        self.producer
            .send(record, Duration::from_secs(5))
            .await
            .map_err(|(e, _)| anyhow::anyhow!("Kafka send error: {e}"))?;
        Ok(())
    }
}

pub struct MqttPublisher {
    client: AsyncClient,
}

impl MqttPublisher {
    pub async fn new(host: &str, port: u16, client_id: &str) -> Result<Self> {
        let mut opts = MqttOptions::new(client_id, host, port);
        opts.set_keep_alive(Duration::from_secs(30));

        let (client, mut eventloop) = AsyncClient::new(opts, 64);

        tokio::spawn(async move {
            loop {
                match eventloop.poll().await {
                    Ok(_) => {}
                    Err(e) => {
                        tracing::warn!("MQTT event loop error: {e}");
                        tokio::time::sleep(Duration::from_secs(2)).await;
                    }
                }
            }
        });

        Ok(Self { client })
    }

    pub async fn publish(&self, topic: &str, payload: &str) -> Result<()> {
        self.client
            .publish(topic, QoS::AtMostOnce, false, payload.as_bytes())
            .await
            .map_err(|e| anyhow::anyhow!("MQTT publish error: {e}"))
    }
}
