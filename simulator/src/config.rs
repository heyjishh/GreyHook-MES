use anyhow::{Context, Result};
use serde::Deserialize;
use std::env;

#[derive(Debug, Deserialize, Clone)]
pub struct MachineConfig {
    pub id: String,
    pub name: String,
    pub machine_type: String,
    pub ideal_cycle_time_seconds: f64,
    pub order_id: String,
}

#[derive(Debug, Deserialize)]
struct TomlConfig {
    org_id: String,
    factory_id: String,
    gateway_id: String,
    machines: Vec<MachineConfig>,
}

#[derive(Debug, Clone)]
pub struct SimConfig {
    pub org_id: String,
    pub factory_id: String,
    pub gateway_id: String,
    pub machines: Vec<MachineConfig>,
    pub kafka_bootstrap_servers: String,
    pub mqtt_host: String,
    pub mqtt_port: u16,
    pub speed_factor: f64,
}

pub fn load() -> Result<SimConfig> {
    let _ = dotenvy::dotenv();

    let raw = include_str!("../config/demo.toml");
    let toml_cfg: TomlConfig = toml::from_str(raw).context("Failed to parse demo.toml")?;

    let org_id = env::var("DEMO_ORG_ID")
        .or_else(|_| env::var("ORGANIZATION_ID"))
        .unwrap_or_else(|_| toml_cfg.org_id.clone());

    let factory_id = env::var("DEMO_FACTORY_ID")
        .or_else(|_| env::var("FACTORY_ID"))
        .unwrap_or_else(|_| toml_cfg.factory_id.clone());

    let kafka_bootstrap_servers = env::var("KAFKA_BOOTSTRAP_SERVERS")
        .unwrap_or_else(|_| "redpanda:9092".to_string());

    let mqtt_broker_url = env::var("MQTT_BROKER_URL")
        .or_else(|_| env::var("MQTT_BROKER"))
        .unwrap_or_else(|_| "mosquitto:1883".to_string());

    let (mqtt_host, mqtt_port) = parse_broker_url(&mqtt_broker_url)?;

    let speed_factor = env::var("SIM_SPEED_FACTOR")
        .ok()
        .and_then(|s| s.parse::<f64>().ok())
        .filter(|&f| f > 0.0)
        .unwrap_or(1.0);

    Ok(SimConfig {
        org_id,
        factory_id,
        gateway_id: toml_cfg.gateway_id,
        machines: toml_cfg.machines,
        kafka_bootstrap_servers,
        mqtt_host,
        mqtt_port,
        speed_factor,
    })
}

fn parse_broker_url(url: &str) -> Result<(String, u16)> {
    let clean = url
        .strip_prefix("mqtt://")
        .or_else(|| url.strip_prefix("tcp://"))
        .unwrap_or(url);

    if let Some((host, port_str)) = clean.rsplit_once(':') {
        let port = port_str
            .parse::<u16>()
            .with_context(|| format!("Invalid port in MQTT broker URL: {url}"))?;
        Ok((host.to_string(), port))
    } else {
        Ok((clean.to_string(), 1883))
    }
}
