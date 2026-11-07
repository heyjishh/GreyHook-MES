use anyhow::{Context, Result};
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub mqtt_host: String,
    pub mqtt_port: u16,
    pub kafka_brokers: String,
    pub org_id: String,
    pub factory_id: String,
    pub gateway_id: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let _ = dotenvy::dotenv();

        let mqtt_broker_url = env::var("MQTT_BROKER_URL")
            .unwrap_or_else(|_| "mqtt://localhost:1883".to_string());
        let (mqtt_host, mqtt_port) = parse_mqtt_url(&mqtt_broker_url)
            .with_context(|| format!("Invalid MQTT_BROKER_URL: {mqtt_broker_url}"))?;

        let kafka_brokers = env::var("KAFKA_BROKERS")
            .or_else(|_| env::var("KAFKA_BOOTSTRAP_SERVERS"))
            .unwrap_or_else(|_| "localhost:9092".to_string());

        let org_id = env::var("ORG_ID")
            .or_else(|_| env::var("ORGANIZATION_ID"))
            .unwrap_or_else(|_| "00000000-0000-0000-0000-000000000001".to_string());

        let factory_id = env::var("FACTORY_ID")
            .unwrap_or_else(|_| "00000000-0000-0000-0000-000000000001".to_string());

        let gateway_id = env::var("GATEWAY_ID")
            .unwrap_or_else(|_| "edge-gateway-01".to_string());

        Ok(Self {
            mqtt_host,
            mqtt_port,
            kafka_brokers,
            org_id,
            factory_id,
            gateway_id,
        })
    }
}

fn parse_mqtt_url(url: &str) -> Result<(String, u16)> {
    let clean = url
        .strip_prefix("mqtt://")
        .or_else(|| url.strip_prefix("tcp://"))
        .unwrap_or(url);

    if let Some((host, port_str)) = clean.rsplit_once(':') {
        let port = port_str.parse::<u16>()
            .with_context(|| format!("Invalid port in MQTT URL: {url}"))?;
        Ok((host.to_string(), port))
    } else {
        Ok((clean.to_string(), 1883))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_mqtt_url_with_scheme() {
        let (host, port) = parse_mqtt_url("mqtt://localhost:1883").unwrap();
        assert_eq!(host, "localhost");
        assert_eq!(port, 1883);
    }

    #[test]
    fn parses_mqtt_url_without_scheme() {
        let (host, port) = parse_mqtt_url("mosquitto:1883").unwrap();
        assert_eq!(host, "mosquitto");
        assert_eq!(port, 1883);
    }

    #[test]
    fn defaults_port_1883() {
        let (host, port) = parse_mqtt_url("mosquitto").unwrap();
        assert_eq!(host, "mosquitto");
        assert_eq!(port, 1883);
    }
}
