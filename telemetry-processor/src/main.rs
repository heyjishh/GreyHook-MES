use anyhow::Result;
use tracing::info;

use greyhook_telemetry_processor::{config::Config, consumer, db};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let config = Config::from_env()?;

    info!(
        kafka = %config.kafka_brokers,
        consumer_group = %config.consumer_group_id,
        "GreyHook telemetry processor starting"
    );

    let pool = db::create_pool(&config.database_url).await?;
    info!("Database pool established");

    consumer::run(&config, pool).await
}
