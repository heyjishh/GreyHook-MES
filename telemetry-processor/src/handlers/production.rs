use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use sqlx::PgPool;
use tracing::{debug, warn};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
struct ProductionEvent {
    event_id: String,
    organization_id: String,
    order_id: String,
    machine_id: String,
    event_time: DateTime<Utc>,
    event_type: String,
    quantity_delta: Option<i64>,
    cumulative_qty: Option<i64>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ProductionEventKind {
    CountIncrement,
    OrderStarted,
    OrderCompleted,
    OrderPaused,
    Unknown,
}

impl ProductionEventKind {
    pub fn from(s: &str) -> Self {
        match s {
            "count_increment" => Self::CountIncrement,
            "order_started" => Self::OrderStarted,
            "order_completed" => Self::OrderCompleted,
            "order_paused" => Self::OrderPaused,
            _ => Self::Unknown,
        }
    }
}

pub async fn handle(pool: &PgPool, raw: &str) -> Result<()> {
    let event: ProductionEvent =
        serde_json::from_str(raw).context("Failed to deserialise production event")?;

    let order_id = match Uuid::parse_str(&event.order_id) {
        Ok(id) => id,
        Err(e) => {
            warn!(
                event_id = %event.event_id,
                order_id = %event.order_id,
                error = %e,
                "Invalid order_id UUID — skipping production event"
            );
            return Ok(());
        }
    };

    let result = match ProductionEventKind::from(&event.event_type) {
        ProductionEventKind::CountIncrement => {
            let qty = event.cumulative_qty.unwrap_or(0);
            sqlx::query(
                r#"
                UPDATE production_orders
                SET actual_qty = $2, updated_at = NOW()
                WHERE id = $1 AND actual_qty < $2
                "#,
            )
            .bind(order_id)
            .bind(qty)
            .execute(pool)
            .await
        }
        ProductionEventKind::OrderStarted => {
            sqlx::query(
                r#"
                UPDATE production_orders
                SET status = 'running',
                    actual_start = COALESCE(actual_start, $2),
                    updated_at = NOW()
                WHERE id = $1
                  AND status NOT IN ('completed', 'cancelled')
                "#,
            )
            .bind(order_id)
            .bind(event.event_time)
            .execute(pool)
            .await
        }
        ProductionEventKind::OrderPaused => {
            sqlx::query(
                r#"
                UPDATE production_orders
                SET status = 'paused', updated_at = NOW()
                WHERE id = $1 AND status = 'running'
                "#,
            )
            .bind(order_id)
            .execute(pool)
            .await
        }
        ProductionEventKind::OrderCompleted => {
            let qty = event.cumulative_qty.unwrap_or(0);
            sqlx::query(
                r#"
                UPDATE production_orders
                SET status = 'completed',
                    actual_end = $2,
                    actual_qty = GREATEST(actual_qty, $3),
                    updated_at = NOW()
                WHERE id = $1
                  AND status NOT IN ('completed', 'cancelled')
                "#,
            )
            .bind(order_id)
            .bind(event.event_time)
            .bind(qty)
            .execute(pool)
            .await
        }
        ProductionEventKind::Unknown => {
            warn!(
                event_id = %event.event_id,
                event_type = %event.event_type,
                "Unknown production event type — skipping"
            );
            return Ok(());
        }
    };

    match result {
        Ok(r) => {
            debug!(
                event_id = %event.event_id,
                event_type = %event.event_type,
                order_id = %event.order_id,
                rows_affected = r.rows_affected(),
                "Production order updated"
            );
        }
        Err(e) => {
            warn!(
                event_id = %event.event_id,
                event_type = %event.event_type,
                order_id = %event.order_id,
                error = %e,
                "Failed to update production order — skipping"
            );
        }
    }

    Ok(())
}
