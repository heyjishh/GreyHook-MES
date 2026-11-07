#!/usr/bin/env bash
# Start GreyHook MES dev environment.
#
# Usage:
#   ./scripts/dev-up.sh               # infra only (postgres, valkey, kafka, temporal)
#   ./scripts/dev-up.sh app           # + backend & frontend
#   ./scripts/dev-up.sh monitoring    # + prometheus, grafana, temporal-ui, redpanda-console
#   ./scripts/dev-up.sh simulate      # + factory simulator
#   ./scripts/dev-up.sh all           # everything

set -euo pipefail

COMPOSE="docker compose"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[dev-up] Created .env from .env.example — edit it to set secrets."
fi

PROFILES=""
for arg in "$@"; do
  case "$arg" in
    app|monitoring|simulate) PROFILES="$PROFILES --profile $arg" ;;
    all) PROFILES="--profile app --profile monitoring --profile simulate" ;;
    *) echo "Unknown profile: $arg"; exit 1 ;;
  esac
done

echo "[dev-up] Pulling images…"
$COMPOSE $PROFILES pull --ignore-pull-failures 2>/dev/null || true

echo "[dev-up] Starting services…"
$COMPOSE $PROFILES up -d --build

echo ""
echo "Services:"
echo "  PostgreSQL+TimescaleDB  → localhost:5435"
echo "  Valkey (Redis)          → localhost:6380"
echo "  Redpanda (Kafka)        → localhost:19092"
echo "  Mosquitto (MQTT)        → localhost:1883"
echo "  Temporal                → localhost:7233"
if echo "$PROFILES" | grep -q app; then
  echo "  Backend API             → http://localhost:8000"
  echo "  Frontend                → http://localhost:3000"
fi
if echo "$PROFILES" | grep -q monitoring; then
  echo "  Grafana                 → http://localhost:3001  (admin / \$GRAFANA_PASSWORD)"
  echo "  Prometheus              → http://localhost:9090"
  echo "  Temporal UI             → http://localhost:8088"
  echo "  Redpanda Console        → http://localhost:8080"
fi
echo ""
echo "Stop: docker compose down"
echo "Logs: docker compose logs -f [service]"
