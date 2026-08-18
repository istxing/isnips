#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "🛑 Stopping iSnips local PostgreSQL container..."
docker compose down
echo "✅ Stopped."
