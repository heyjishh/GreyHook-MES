use serde_json::Value;

#[derive(Debug, PartialEq, Eq)]
pub enum TopicKind {
    Telemetry,
    Event,
    Unknown,
}

pub fn classify_topic(topic: &str) -> TopicKind {
    match topic.split('/').next_back() {
        Some("telemetry") => TopicKind::Telemetry,
        Some("events") => TopicKind::Event,
        _ => TopicKind::Unknown,
    }
}

pub fn kafka_topic_for_event(event_type: &str) -> &'static str {
    if event_type.starts_with("downtime_") {
        "mes.downtime.events"
    } else {
        "mes.production.events"
    }
}

pub fn machine_id_key(payload: &Value) -> String {
    payload["machine_id"]
        .as_str()
        .unwrap_or("unknown")
        .to_string()
}

pub fn event_type_str(payload: &Value) -> &str {
    payload["event_type"].as_str().unwrap_or("unknown")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn classifies_telemetry_single_level() {
        assert_eq!(classify_topic("factory/M001/telemetry"), TopicKind::Telemetry);
    }

    #[test]
    fn classifies_telemetry_multi_level() {
        assert_eq!(
            classify_topic("factory/factory-01/M001/telemetry"),
            TopicKind::Telemetry
        );
    }

    #[test]
    fn classifies_event() {
        assert_eq!(classify_topic("factory/M001/events"), TopicKind::Event);
        assert_eq!(
            classify_topic("factory/f01/M001/events"),
            TopicKind::Event
        );
    }

    #[test]
    fn classifies_unknown() {
        assert_eq!(classify_topic("some/random/topic"), TopicKind::Unknown);
        assert_eq!(classify_topic("factory/M001"), TopicKind::Unknown);
    }

    #[test]
    fn routes_downtime_events_to_downtime_topic() {
        assert_eq!(kafka_topic_for_event("downtime_opened"), "mes.downtime.events");
        assert_eq!(kafka_topic_for_event("downtime_closed"), "mes.downtime.events");
        assert_eq!(kafka_topic_for_event("downtime_categorized"), "mes.downtime.events");
    }

    #[test]
    fn routes_production_events_to_production_topic() {
        assert_eq!(kafka_topic_for_event("count_increment"), "mes.production.events");
        assert_eq!(kafka_topic_for_event("order_started"), "mes.production.events");
        assert_eq!(kafka_topic_for_event("order_completed"), "mes.production.events");
        assert_eq!(kafka_topic_for_event("order_paused"), "mes.production.events");
    }

    #[test]
    fn extracts_machine_id_from_payload() {
        let payload = json!({"machine_id": "M001", "event_type": "machine_telemetry"});
        assert_eq!(machine_id_key(&payload), "M001");
    }

    #[test]
    fn machine_id_fallback_on_missing() {
        let payload = json!({"event_type": "machine_telemetry"});
        assert_eq!(machine_id_key(&payload), "unknown");
    }
}
