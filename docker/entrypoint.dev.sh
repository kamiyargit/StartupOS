#!/bin/sh
set -e

PLANE="${KARTIN_PLANE:-${STARTUPOS_PLANE:-tenant}}"
MODE="${KARTIN_MODE:-${STARTUPOS_MODE:-self_hosted}}"

echo "Kartin dev entrypoint — plane=$PLANE mode=$MODE unified=${KARTIN_UNIFIED_DEV:-false}"

node scripts/apply-radix-compose-refs-patch.mjs

echo "Running prisma db push (tenant schema)..."
npx prisma db push

if [ -n "$DATABASE_URL_CONTROL" ]; then
  echo "Running prisma db push (control schema)..."
  npx prisma db push --schema=prisma/control/schema.prisma
fi

echo "Running prisma generate..."
npx prisma generate
npx prisma generate --schema=prisma/control/schema.prisma

if [ "$KARTIN_UNIFIED_DEV" = "true" ]; then
  echo "Unified dev — control + tenant on one server (host-based routing)"
elif [ "$PLANE" = "control" ]; then
  echo "Control plane dev — skipping tenant seed"
elif [ "$PLANE" = "tenant" ] && [ "$MODE" = "cloud" ]; then
  echo "Cloud tenant dev — skipping seed (use setup portal to provision)"
else
  echo "Running seed..."
  npx tsx prisma/seed.ts || echo "WARN: seed failed (app will still start)"
fi

echo "Starting Next.js dev server..."
exec npm run dev:docker
