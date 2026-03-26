#!/bin/bash
#
# collect-502-diagnostics.sh — Collect evidence for 502 Bad Gateway job detail issue
# 
# Usage:
#   bash collect-502-diagnostics.sh        # Collect current state snapshot
#   bash collect-502-diagnostics.sh live   # Tail logs and wait for failure (30 seconds)
#
# Output: Creates diagnostics_TIMESTAMP.txt with all collected info
#

set -e

MODE="${1:-snapshot}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="diagnostics_${TIMESTAMP}.txt"
DOCKER_COMPOSE_CMD="docker compose -f docker-compose.prod.yml"

echo "=== 502 Diagnostics Collection ==="
echo "Mode: $MODE"
echo "Output: $OUTPUT_FILE"
echo ""

{
  echo "=== TIMESTAMP ==="
  date -u
  echo ""

  echo "=== DOCKER SERVICE STATUS ==="
  $DOCKER_COMPOSE_CMD ps
  echo ""

  echo "=== BACKEND HEALTH ENDPOINT ==="
  if command -v curl &> /dev/null; then
    curl -s -m 5 http://localhost:3000/health 2>&1 || echo "Health endpoint unreachable"
  else
    echo "curl not available"
  fi
  echo ""

  echo "=== POSTGRES CONNECTIVITY ==="
  docker exec dj-postgres-prod pg_isready -U postgres -d dj_system 2>&1 || echo "DB unreachable"
  echo ""

  echo "=== RECENT BACKEND LOGS (last 50 lines) ==="
  docker logs dj-backend-prod --tail=50 2>&1 || echo "No backend logs"
  echo ""

  echo "=== RECENT FRONTEND LOGS (last 50 lines) ==="
  docker logs dj-frontend-prod --tail=50 2>&1 || echo "No frontend logs"
  echo ""

  echo "=== NGINX ERROR LOG (if accessible) ==="
  docker exec dj-frontend-prod cat /var/log/nginx/error.log 2>/dev/null | tail -30 || echo "Nginx error log not accessible"
  echo ""

  echo "=== BACKEND ENVIRONMENT (relevant vars only) ==="
  docker exec dj-backend-prod sh -c 'echo DATABASE_URL=$DATABASE_URL; echo NODE_ENV=$NODE_ENV; echo AUTH_MODE=$AUTH_MODE' 2>&1 || echo "Env vars not accessible"
  echo ""

  echo "=== DATABASE ACTIVE CONNECTIONS ==="
  docker exec dj-postgres-prod psql -U postgres -d dj_system -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;" 2>&1 || echo "Query failed"
  echo ""

  if [ "$MODE" = "live" ]; then
    echo "=== LIVE LOG TAIL (waiting 30 seconds for failure event) ==="
    echo "👉 Trigger the failure now in browser (click job detail page)"
    echo "   Collecting logs for 30 seconds..."
    echo ""
    
    # Tail logs for 30 seconds
    timeout 30 $DOCKER_COMPOSE_CMD logs --follow backend 2>&1 || true
    echo ""
    
    echo "=== POST-FAILURE BACKEND HEALTH ==="
    curl -s -m 5 http://localhost:3000/health 2>&1 || echo "Backend still unhealthy"
  fi

} | tee "$OUTPUT_FILE"

echo ""
echo "✅ Diagnostics saved to: $OUTPUT_FILE"
echo ""
echo "Next: Share this file with the development team for analysis ⬆️"
