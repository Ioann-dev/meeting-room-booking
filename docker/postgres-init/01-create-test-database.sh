#!/bin/sh
# Runs once, only on first container initialization (empty data volume).
# The image already creates $POSTGRES_DB automatically; this adds a second,
# isolated database (same name + _test) so the test suite never touches
# development data, regardless of what POSTGRES_DB is configured as.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE "${POSTGRES_DB}_test";
EOSQL
