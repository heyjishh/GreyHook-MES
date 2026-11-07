use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::Value;
use sqlx::PgPool;
use tracing::{debug, warn};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
struct TelemetryEvent {
    event_id: String,
    machine_id: String,
    organization_id: String,
    event_time: DateTime<Utc>,
    gateway_id: String,
    event_type: String,
    payload: Value,
    source_seq: Option<i64>,
}

pub async fn handle(pool: &PgPool, raw: &str) -> Result<()> {
    let event: TelemetryEvent =
        serde_json::from_str(raw).context("Failed to deserialise telemetry event")?;

    let event_id = parse_uuid(&event.event_id).context("Invalid event_id UUID")?;
    let machine_id = parse_uuid(&event.machine_id).context("Invalid machine_id UUID")?;
    let org_id = parse_uuid(&event.organization_id).context("Invalid organization_id UUID")?;

    let payload_json = serde_json::to_string(&event.payload)
        .context("Failed to serialise payload to JSON string")?;

    let result = sqlx::query(
        r#"
        INSERT INTO machine_events
            (event_id, organization_id, machine_id, event_time, ingested_at,
             event_type, payload, source_seq, gateway_id)
        VALUES ($1, $2, $3, $4, NOW(), $5, $6::jsonb, $7, $8)
        ON CONFLICT (event_id, event_time) DO NOTHING
        "#,
    )
    .bind(event_id)
    .bind(org_id)
    .bind(machine_id)
    .bind(event.event_time)
    .bind(&event.event_type)
    .bind(&payload_json)
    .bind(event.source_seq)
    .bind(&event.gateway_id)
    .execute(pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => {
            debug!(event_id = %event.event_id, "Telemetry event already ingested — skipped");
        }
        Ok(_) => {
            debug!(
                event_id = %event.event_id,
                machine_id = %event.machine_id,
                event_time = %event.event_time,
                "Telemetry event written to machine_events"
            );
        }
        Err(e) => {
            warn!(
                event_id = %event.event_id,
                machine_id = %event.machine_id,
                error = %e,
                "Failed to write telemetry event — skipping"
            );
        }
    }

    Ok(())
}

fn parse_uuid(s: &str) -> Result<Uuid> {
    Uuid::parse_str(s).with_context(|| format!("Invalid UUID '{s}'"))
}
