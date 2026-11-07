use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use sqlx::PgPool;
use tracing::{debug, warn};
use uuid::Uuid;

const UNCLASSIFIED: &str = "UNCLASSIFIED";

#[derive(Debug, Deserialize)]
struct DowntimeEvent {
    event_id: String,
    organization_id: String,
    machine_id: String,
    downtime_event_id: String,
    event_time: DateTime<Utc>,
    event_type: String,
    category_code: Option<String>,
    duration_seconds: Option<f64>,
}

pub fn category_or_default(category: Option<&str>) -> &str {
    match category {
        Some(c) if !c.is_empty() => c,
        _ => UNCLASSIFIED,
    }
}

pub async fn handle(pool: &PgPool, raw: &str) -> Result<()> {
    let event: DowntimeEvent =
        serde_json::from_str(raw).context("Failed to deserialise downtime event")?;

    let downtime_id = match Uuid::parse_str(&event.downtime_event_id) {
        Ok(id) => id,
        Err(e) => {
            warn!(
                event_id = %event.event_id,
                downtime_event_id = %event.downtime_event_id,
                error = %e,
                "Invalid downtime_event_id UUID — skipping"
            );
            return Ok(());
        }
    };

    let machine_id = match Uuid::parse_str(&event.machine_id) {
        Ok(id) => id,
        Err(e) => {
            warn!(
                event_id = %event.event_id,
                machine_id = %event.machine_id,
                error = %e,
                "Invalid machine_id UUID — skipping downtime event"
            );
            return Ok(());
        }
    };

    let org_id = match Uuid::parse_str(&event.organization_id) {
        Ok(id) => id,
        Err(e) => {
            warn!(
                event_id = %event.event_id,
                organization_id = %event.organization_id,
                error = %e,
                "Invalid organization_id UUID — skipping downtime event"
            );
            return Ok(());
        }
    };

    let result = match event.event_type.as_str() {
        "downtime_opened" => {
            let category = category_or_default(event.category_code.as_deref());
            sqlx::query(
                r#"
                INSERT INTO downtime_events
                    (id, organization_id, machine_id, category, started_at, is_planned, created_at)
                VALUES ($1, $2, $3, $4, $5, false, NOW())
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(downtime_id)
            .bind(org_id)
            .bind(machine_id)
            .bind(category)
            .bind(event.event_time)
            .execute(pool)
            .await
        }
        "downtime_closed" => {
            let duration_secs = event.duration_seconds.map(|d| d as i32);
            sqlx::query(
                r#"
                UPDATE downtime_events
                SET ended_at = $2,
                    duration_seconds = $3
                WHERE id = $1
                "#,
            )
            .bind(downtime_id)
            .bind(event.event_time)
            .bind(duration_secs)
            .execute(pool)
            .await
        }
        "downtime_categorized" => {
            let category = category_or_default(event.category_code.as_deref());
            sqlx::query(
                r#"
                UPDATE downtime_events
                SET category = $2
                WHERE id = $1
                "#,
            )
            .bind(downtime_id)
            .bind(category)
            .execute(pool)
            .await
        }
        other => {
            warn!(
                event_id = %event.event_id,
                event_type = other,
                "Unknown downtime event type — skipping"
            );
            return Ok(());
        }
    };

    match result {
        Ok(r) if r.rows_affected() == 0 && event.event_type == "downtime_opened" => {
            debug!(
                downtime_event_id = %event.downtime_event_id,
                "Downtime event already recorded — skipped"
            );
        }
        Ok(r) => {
            debug!(
                downtime_event_id = %event.downtime_event_id,
                event_type = %event.event_type,
                rows_affected = r.rows_affected(),
                "Downtime event written"
            );
        }
        Err(e) => {
            warn!(
                downtime_event_id = %event.downtime_event_id,
                event_type = %event.event_type,
                error = %e,
                "Failed to write downtime event — skipping"
            );
        }
    }

    Ok(())
}
