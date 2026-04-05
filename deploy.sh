#!/usr/bin/env bash
set -euo pipefail

echo "=== Quantmail Deploy ==="

# ── Environment validation ─────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Export it before running this script."
  echo "  Example: export DATABASE_URL='postgresql://user:pass@host:5432/quantmail'"
  exit 1
fi

# ── Database migrations ────────────────────────────────────────────────────────
echo "Running Prisma migrations..."
npx prisma migrate deploy
echo "Migrations applied."

# ── Docker build ───────────────────────────────────────────────────────────────
echo "Building Docker image..."
docker build -t quantmail:latest .
echo "Image built successfully."

# ── Run instructions ───────────────────────────────────────────────────────────
echo ""
echo "Start the server with:"
echo "  docker run -p 3000:3000 \\"
echo "    -e DATABASE_URL=\"\$DATABASE_URL\" \\"
echo "    -e SSO_SECRET=\"\${SSO_SECRET:-change-me-in-production}\" \\"
echo "    -e LIVENESS_PROVIDER=\"\${LIVENESS_PROVIDER:-local}\" \\"
echo "    quantmail:latest"
