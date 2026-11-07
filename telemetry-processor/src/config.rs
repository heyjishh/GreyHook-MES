use anyhow::Result;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub kafka_brokers: String,
    pub database_url: String,
    pub consumer_group_id: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let _ = dotenvy::dotenv();

        let kafka_brokers = env::var("KAFKA_BROKERS")
            .or_else(|_| env::var("KAFKA_BOOTSTRAP_SERVERS"))
            .unwrap_or_else(|_| "localhost:9092".to_string());

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| {
                "postgresql://greyhook:devpassword@localhost:5435/greyhook_mes".to_string()
            });

        let consumer_group_id = env::var("CONSUMER_GROUP_ID")
            .unwrap_or_else(|_| "telemetry-processor".to_string());

        Ok(Self {
            kafka_brokers,
            database_url,
            consumer_group_id,
        })
    }
}
