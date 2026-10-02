#!/usr/bin/env bash
#
# One command to bring up everything the app needs locally.
#
#   npm run dev:up            # (re)start the stack, keep existing data
#   npm run dev:up -- --reset # same, but wipe the database first
#
# Starts Postgres + the neon-http proxy (docker-compose.yml), applies migrations, seeds a
# demo teacher with students and lessons, and makes sure .env.local exists.
# The Next.js dev server itself is NOT started here — run `npm run dev` afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."

RESET=0
[[ "${1:-}" == "--reset" ]] && RESET=1

export NEON_LOCAL=1
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/student_calendar"

info() { printf '\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }

if ! docker info >/dev/null 2>&1; then
  echo "Docker doesn't appear to be running. Start Docker Desktop and try again." >&2
  exit 1
fi

if [[ $RESET == 1 ]]; then
  info "Reset requested — removing containers AND wiping the database volume."
  docker compose down --volumes --remove-orphans >/dev/null 2>&1 || true
else
  docker compose down --remove-orphans >/dev/null 2>&1 || true
fi

info "Starting Postgres + neon-http proxy…"
docker compose up -d --wait

info "Waiting for the neon-http proxy on :4444…"
for i in $(seq 1 30); do
  if (exec 3<>/dev/tcp/localhost/4444) 2>/dev/null; then exec 3>&- 3<&-; break; fi
  [[ $i == 30 ]] && { echo "Proxy never came up. Check: docker compose logs neon-proxy" >&2; exit 1; }
  sleep 1
done

info "Applying migrations…"
npx tsx scripts/migrate.ts

info "Seeding demo data…"
npx tsx scripts/seed-dev.ts

[[ -f .env.local ]] || cp .env.local.example .env.local

echo
ok "Local stack ready."
echo "   Demo login : demo@example.com / demo1234"
echo "   Next       : npm run dev   then open http://localhost:3000"
echo "   Stop       : npm run dev:down"
