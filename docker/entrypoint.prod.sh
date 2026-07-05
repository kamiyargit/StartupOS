#!/bin/sh
# Build DATABASE_URL with URL-encoded password (required when password has # : % / etc.)
set -e

ENC_PW=$(node -e "console.log(encodeURIComponent(process.env.POSTGRES_PASSWORD || ''))")
export DATABASE_URL="postgresql://${POSTGRES_USER}:${ENC_PW}@db:5432/${POSTGRES_DB}"

echo "Running legacy financier payment migration (if needed)..."
node scripts/migrate-legacy-financier-payments.mjs

echo "Running prisma db push..."
prisma db push --skip-generate

echo "Running seed (essential data only)..."
if ! tsx prisma/seed.ts; then
  echo "WARN: seed failed (app will still start; rerun seed after deploy if needed)" >&2
fi
echo "Tip: use 'tsx prisma/seed.ts --fresh-seed-data' or npm run db:seed:fresh for sample cost types."

echo "Starting Next.js..."
exec node server.js
