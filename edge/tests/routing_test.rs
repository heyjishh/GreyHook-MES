use greyhook_edge::routing::*;
use serde_json::json;

#[test]
fn classifies_simulator_telemetry_topic() {
    assert_eq!(classify_topic("factory/M001/telemetry"), TopicKind::Telemetry);
}

#[test]
fn classifies_multi_level_telemetry_topic() {
    assert_eq!(
        classify_topic("factory/factory-01/M001/telemetry"),
        TopicKind::Telemetry
    );
}

#[test]
fn classifies_event_topic() {
    assert_eq!(classify_topic("factory/M001/events"), TopicKind::Event);
    assert_eq!(classify_topic("factory/f01/M001/events"), TopicKind::Event);
}

#[test]
fn classifies_unknown_topics() {
    assert_eq!(classify_topic("some/random/topic"), TopicKind::Unknown);
    assert_eq!(classify_topic("factory/M001"), TopicKind::Unknown);
    assert_eq!(classify_topic(""), TopicKind::Unknown);
    assert_eq!(classify_topic("factory"), TopicKind::Unknown);
}

#[test]
fn downtime_events_route_to_downtime_kafka_topic() {
    assert_eq!(kafka_topic_for_event("downtime_opened"), "mes.downtime.events");
    assert_eq!(kafka_topic_for_event("downtime_closed"), "mes.downtime.events");
    assert_eq!(kafka_topic_for_event("downtime_categorized"), "mes.downtime.events");
}

#[test]
fn production_events_route_to_production_kafka_topic() {
    assert_eq!(kafka_topic_for_event("count_increment"), "mes.production.events");
    assert_eq!(kafka_topic_for_event("order_started"), "mes.production.events");
    assert_eq!(kafka_topic_for_event("order_completed"), "mes.production.events");
    assert_eq!(kafka_topic_for_event("order_paused"), "mes.production.events");
}

#[test]
fn unknown_event_type_routes_to_production_topic() {
    assert_eq!(kafka_topic_for_event("unknown_event"), "mes.production.events");
}

#[test]
fn extracts_machine_id_from_payload() {
    let payload = json!({"machine_id": "M001", "event_type": "machine_telemetry"});
    assert_eq!(machine_id_key(&payload), "M001");
}

#[test]
fn machine_id_key_falls_back_on_missing_field() {
    let payload = json!({"event_type": "machine_telemetry"});
    assert_eq!(machine_id_key(&payload), "unknown");
}

#[test]
fn event_type_str_extracts_correctly() {
    let payload = json!({"event_type": "count_increment"});
    assert_eq!(event_type_str(&payload), "count_increment");
}

#[test]
fn event_type_str_falls_back_on_missing() {
    let payload = json!({"machine_id": "M001"});
    assert_eq!(event_type_str(&payload), "unknown");
}
