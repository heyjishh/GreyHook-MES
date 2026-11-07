use greyhook_telemetry_processor::handlers::{downtime, production};

#[test]
fn category_or_default_returns_code_when_present() {
    assert_eq!(downtime::category_or_default(Some("ME-01")), "ME-01");
    assert_eq!(downtime::category_or_default(Some("CH-04")), "CH-04");
}

#[test]
fn category_or_default_returns_unclassified_for_none() {
    assert_eq!(downtime::category_or_default(None), "UNCLASSIFIED");
}

#[test]
fn category_or_default_returns_unclassified_for_empty_string() {
    assert_eq!(downtime::category_or_default(Some("")), "UNCLASSIFIED");
}

#[test]
fn production_event_kind_from_known_types() {
    use production::ProductionEventKind;

    assert_eq!(
        ProductionEventKind::from("count_increment"),
        ProductionEventKind::CountIncrement
    );
    assert_eq!(
        ProductionEventKind::from("order_started"),
        ProductionEventKind::OrderStarted
    );
    assert_eq!(
        ProductionEventKind::from("order_completed"),
        ProductionEventKind::OrderCompleted
    );
    assert_eq!(
        ProductionEventKind::from("order_paused"),
        ProductionEventKind::OrderPaused
    );
}

#[test]
fn production_event_kind_from_unknown_falls_back() {
    use production::ProductionEventKind;

    assert_eq!(
        ProductionEventKind::from("some_future_event"),
        ProductionEventKind::Unknown
    );
    assert_eq!(
        ProductionEventKind::from(""),
        ProductionEventKind::Unknown
    );
}

#[test]
fn downtime_telemetry_payload_roundtrip() {
    let raw = serde_json::json!({
        "event_id": "00000000-0000-0000-0000-000000000001",
        "organization_id": "00000000-0000-0000-0000-000000000001",
        "machine_id": "00000000-0000-0000-0000-000000000002",
        "downtime_event_id": "00000000-0000-0000-0000-000000000003",
        "event_time": "2026-11-04T10:30:00Z",
        "event_type": "downtime_opened",
        "category_code": null,
        "duration_seconds": null
    });
    let event_type = raw["event_type"].as_str().unwrap();
    assert!(event_type.starts_with("downtime_"));

    let category = raw["category_code"].as_str();
    assert_eq!(downtime::category_or_default(category), "UNCLASSIFIED");
}

#[test]
fn production_telemetry_payload_roundtrip() {
    use production::ProductionEventKind;

    let raw = serde_json::json!({
        "event_id": "00000000-0000-0000-0000-000000000001",
        "organization_id": "00000000-0000-0000-0000-000000000001",
        "order_id": "00000000-0000-0000-0001-000000000001",
        "machine_id": "00000000-0000-0000-0000-000000000002",
        "event_time": "2026-11-04T10:30:00Z",
        "event_type": "count_increment",
        "quantity_delta": 1,
        "cumulative_qty": 100
    });

    let event_type = raw["event_type"].as_str().unwrap();
    assert_eq!(
        ProductionEventKind::from(event_type),
        ProductionEventKind::CountIncrement
    );
    assert_eq!(raw["cumulative_qty"].as_i64().unwrap(), 100);
}
