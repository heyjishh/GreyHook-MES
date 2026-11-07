use anyhow::Result;
use rdkafka::consumer::{CommitMode, Consumer, StreamConsumer};
use rdkafka::ClientConfig;
use rdkafka::Message;
use sqlx::PgPool;
use tracing::{error, info, warn};

use crate::config::Config;
use crate::handlers::{downtime, production, telemetry};

const TOPICS: &[&str] = &[
    "mes.telemetry.raw",
    "mes.production.events",
    "mes.downtime.events",
];

pub async fn run(config: &Config, pool: PgPool) -> Result<()> {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("group.id", &config.consumer_group_id)
        .set("bootstrap.servers", &config.kafka_brokers)
        .set("enable.auto.commit", "false")
        .set("auto.offset.reset", "earliest")
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "30000")
        .set("heartbeat.interval.ms", "10000")
        .create()?;

    consumer.subscribe(TOPICS)?;
    info!(
        topics = ?TOPICS,
        group_id = %config.consumer_group_id,
        "Kafka consumer subscribed"
    );

    loop {
        match consumer.recv().await {
            Err(e) => {
                error!(error = %e, "Kafka recv error");
            }
            Ok(msg) => {
                let topic = msg.topic();
                let payload = match msg.payload_view::<str>() {
                    Some(Ok(s)) => s,
                    Some(Err(e)) => {
                        warn!(topic, error = %e, "Non-UTF-8 Kafka payload — skipping");
                        commit_offset(&consumer, &msg);
                        continue;
                    }
                    None => {
                        warn!(topic, "Empty Kafka payload — skipping");
                        commit_offset(&consumer, &msg);
                        continue;
                    }
                };

                let handle_result = match topic {
                    "mes.telemetry.raw" => telemetry::handle(&pool, payload).await,
                    "mes.production.events" => production::handle(&pool, payload).await,
                    "mes.downtime.events" => downtime::handle(&pool, payload).await,
                    other => {
                        warn!(topic = other, "Received message on unexpected topic");
                        Ok(())
                    }
                };

                if let Err(e) = handle_result {
                    warn!(topic, error = %e, "Handler error — committing offset and continuing");
                }

                commit_offset(&consumer, &msg);
            }
        }
    }
}

fn commit_offset(consumer: &StreamConsumer, msg: &rdkafka::message::BorrowedMessage<'_>) {
    if let Err(e) = consumer.commit_message(msg, CommitMode::Async) {
        warn!(error = %e, "Failed to commit Kafka offset");
    }
}
