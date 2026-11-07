#!/bin/bash
set -euo pipefail

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
NC='\033[0m'
info()  { echo -e "${BLUE}[info]${NC} $*"; }
ok()    { echo -e "${GREEN}[ok]${NC}   $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
die()   { echo -e "${RED}[fail]${NC} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo ""
echo "  GreyHook MES — OCI Free Tier Deployment"
echo "  Region: ap-mumbai-1 | Shape: VM.Standard.A1.Flex (4 OCPUs / 24 GB)"
echo ""

# ─── Check dependencies ─────────────────────────────────────────────────────
info "Checking dependencies..."
command -v terraform >/dev/null 2>&1 || die "terraform not found. Install from https://developer.hashicorp.com/terraform/install"
command -v oci       >/dev/null 2>&1 || die "oci CLI not found. Run: pip install oci-cli"
command -v docker    >/dev/null 2>&1 || die "docker not found"

# ─── Check OCI auth ─────────────────────────────────────────────────────────
info "Validating OCI CLI config..."
oci iam region list --output table >/dev/null 2>&1 || die "OCI CLI not authenticated. See README steps below."

# ─── Collect secrets ─────────────────────────────────────────────────────────
info "Collecting deployment secrets..."

if [ -z "${TF_VAR_postgres_password:-}" ]; then
  read -rsp "  Postgres password (leave blank for auto-generate): " PG_PASS
  echo ""
  if [ -z "$PG_PASS" ]; then
    PG_PASS=$(openssl rand -hex 16)
    warn "Auto-generated postgres password: $PG_PASS (save this!)"
  fi
  export TF_VAR_postgres_password="$PG_PASS"
fi

if [ -z "${TF_VAR_jwt_secret:-}" ]; then
  export TF_VAR_jwt_secret=$(openssl rand -hex 32)
  warn "Auto-generated JWT secret (saved to terraform state)"
fi

export TF_VAR_api_fingerprint="${TF_VAR_api_fingerprint:-df:c3:33:2c:17:bf:05:d5:86:7e:0c:19:eb:2c:b8:df}"
export TF_VAR_api_private_key_path="${TF_VAR_api_private_key_path:-$HOME/.oci/greyhook_key.pem}"

# ─── Terraform ───────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"

info "Initializing Terraform..."
terraform init -upgrade

info "Planning infrastructure..."
terraform plan -out=tfplan

info "Applying — this provisions your OCI A1 Flex instance..."
terraform apply tfplan

PUBLIC_IP=$(terraform output -raw instance_public_ip)
SSH_KEY="$SCRIPT_DIR/greyhook_ssh_key.pem"

ok "Instance is up at $PUBLIC_IP"
info "Waiting for SSH to become available (up to 3 min)..."

for i in $(seq 1 36); do
  if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@"$PUBLIC_IP" true 2>/dev/null; then
    ok "SSH is ready"
    break
  fi
  echo -n "."
  sleep 5
done
echo ""

# ─── Upload and build frontend ────────────────────────────────────────────────
info "Uploading frontend source to instance..."
rsync -az --exclude 'node_modules' --exclude '.next' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$PROJECT_ROOT/frontend/" ubuntu@"$PUBLIC_IP":/opt/greyhook/frontend/

info "Building frontend Docker image on instance..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@"$PUBLIC_IP" \
  "cd /opt/greyhook && sudo docker build -t greyhook-frontend:latest frontend/ 2>&1"

info "Starting GreyHook MES stack..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@"$PUBLIC_IP" \
  "cd /opt/greyhook && sudo docker compose up -d 2>&1"

echo ""
ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ok "  GreyHook MES is LIVE"
ok ""
ok "  Dashboard: http://$PUBLIC_IP"
ok "  Direct:    http://$PUBLIC_IP:3000"
ok ""
ok "  SSH: ssh -i $SSH_KEY ubuntu@$PUBLIC_IP"
ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
