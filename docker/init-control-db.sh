#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE kartin_control'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'kartin_control')\gexec
EOSQL
