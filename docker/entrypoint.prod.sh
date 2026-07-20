#!/bin/sh
set -e

ENC_PW=$(node -e "console.log(encodeURIComponent(process.env.POSTGRES_PASSWORD || ''))")
export DATABASE_URL="postgresql://${POSTGRES_USER}:${ENC_PW}@db:5432/${POSTGRES_DB}"

PLANE="${KARTIN_PLANE:-${STARTUPOS_PLANE:-tenant}}"
MODE="${KARTIN_MODE:-${STARTUPOS_MODE:-self_hosted}}"
ENABLE_SELF_HOSTED="${ENABLE_SELF_HOSTED:-false}"

if [ "$ENABLE_SELF_HOSTED" != "true" ] && [ "$MODE" = "self_hosted" ] && [ "$PLANE" != "control" ]; then
  echo "ERROR: Self-hosted mode is disabled (ENABLE_SELF_HOSTED=false). Use KARTIN_MODE=cloud." >&2
  exit 1
fi

if [ "$ENABLE_SELF_HOSTED" != "true" ]; then
  MODE="cloud"
fi

echo "Kartin entrypoint — plane=$PLANE mode=$MODE"

echo "Running prisma db push (tenant schema)..."
prisma db push --skip-generate

if [ "$PLANE" = "control" ]; then
  if [ -n "$DATABASE_URL_CONTROL" ]; then
    echo "Running prisma db push (control schema)..."
    DATABASE_URL="$DATABASE_URL_CONTROL" prisma db push --schema=prisma/control/schema.prisma --skip-generate
  else
    echo "WARN: DATABASE_URL_CONTROL not set — control DB schema not applied" >&2
  fi
  echo "Starting Next.js (control plane)..."
  exec node server.js
fi

if [ "$MODE" = "cloud" ]; then
  echo "Cloud tenant mode — skipping auto-seed (installation via setup portal)"
else
  echo "Running legacy financier payment migration (if needed)..."
  node scripts/migrate-legacy-financier-payments.mjs || true

  echo "Running seed (self-hosted)..."
  if ! tsx prisma/seed.ts; then
    echo "WARN: seed failed (app will still start)" >&2
  fi
fi

echo "Starting Next.js (tenant plane)..."
exec node server.js
