#!/usr/bin/env bash
set -euo pipefail

SERVICE="all"
for arg in "$@"; do
  case "$arg" in
    --service=*) SERVICE="${arg#*=}" ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

run_transactional_seed() {
  local script_path="$ROOT_DIR/services/transactional-supabase-foobar/database/scripts/run-sql-seed-external.sh"
  if [ -x "$script_path" ] || [ -f "$script_path" ]; then
    echo "Seeding transactional-supabase-foobar (ufa-lite)..."
    (cd "$ROOT_DIR/services/transactional-supabase-foobar" && ./database/scripts/run-sql-seed-external.sh || bash ./database/scripts/run-sql-seed-external.sh)
  else
    echo "Transactional seed script not found: $script_path"
  fi
}

run_analytical_seed() {
  echo "No analytical seed step defined for ufa-lite; skipping."
}

case "$SERVICE" in
  transactional-supabase-foobar)
    run_transactional_seed
    ;;
  analytical-moose-foobar)
    run_analytical_seed
    ;;
  all)
    run_transactional_seed
    run_analytical_seed
    ;;
  *)
    echo "Unknown service: $SERVICE" >&2
    exit 1
    ;;
cesac
EOF
chmod +x /Users/cjus/dev/area-code/ufa-lite/scripts/dev-seed.sh