#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "🚀 Starting iSnips local PostgreSQL container..."
docker compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready on port 5432..."
until docker exec isnips-postgres pg_isready -U isnips -d isnips_db > /dev/null 2>&1; do
  sleep 1
done

echo "✅ iSnips local PostgreSQL is ready! Connection URL:"
echo "postgresql://isnips:isnips_secret@localhost:5432/isnips_db?schema=public"
