#!/usr/bin/env bash
set -euo pipefail

API_BASE="http://localhost:3000/api"

json_get() {
  node -e "$1"
}

TOKEN=$(curl -sS -X POST "$API_BASE/auth/login-demo" \
  -H 'Content-Type: application/json' \
  -d '{"userId":1}' | json_get "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s||'{}');process.stdout.write(j?.data?.token||'')})")

if [[ -z "$TOKEN" ]]; then
  echo "[FAIL] token: empty"
  exit 1
fi

echo "[PASS] token: acquired"

USERS_JSON=$(curl -sS "$API_BASE/users?page=1&limit=1000&role=Assignee&activeOnly=true" \
  -H "Authorization: Bearer $TOKEN")

USERS_SUMMARY=$(echo "$USERS_JSON" | json_get "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s||'{}'); const users=j?.data?.data||[]; const inactive=users.filter(u=>u.isActive===false).length; process.stdout.write(JSON.stringify({success:!!j.success,total:users.length,inactive}))})")

echo "[INFO] users activeOnly summary: $USERS_SUMMARY"

PROJECT_ID=$(curl -sS "$API_BASE/projects" -H "Authorization: Bearer $TOKEN" | json_get "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s||'{}');const arr=j?.data||[];process.stdout.write(arr[0]?String(arr[0].id):'')})")

if [[ -n "$PROJECT_ID" ]]; then
  MATRIX_JSON=$(curl -sS "$API_BASE/approval-flows/matrix?projectId=$PROJECT_ID" -H "Authorization: Bearer $TOKEN")
  MATRIX_SUMMARY=$(echo "$MATRIX_JSON" | json_get "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s||'{}');const rows=j?.data||[];const inactiveRows=rows.filter(r=>r?.assignee&&r.assignee.isActive===false).length;process.stdout.write(JSON.stringify({success:!!j.success,rows:rows.length,inactiveRows}))})")
  echo "[INFO] matrix summary: $MATRIX_SUMMARY"
else
  echo "[WARN] matrix summary: skipped (no project)"
fi

JOB_ID=$(curl -sS "$API_BASE/jobs?role=requester&page=1&limit=1" -H "Authorization: Bearer $TOKEN" | json_get "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s||'{}');const rows=j?.data?.data||[];process.stdout.write(rows[0]?String(rows[0].id):'')})")
INACTIVE_USER_ID=$(docker exec dj-postgres-prod psql -U postgres -d dj_system -t -A -c "SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id AND lower(ur.role_name)='assignee' WHERE u.is_active=false ORDER BY u.id LIMIT 1;" | tr -d '\r')

if [[ -n "$JOB_ID" && -n "$INACTIVE_USER_ID" ]]; then
  HTTP_CODE=$(curl -sS -o /tmp/reassign_smoke.json -w "%{http_code}" -X POST "$API_BASE/jobs/$JOB_ID/reassign" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"newAssigneeId\":$INACTIVE_USER_ID,\"reason\":\"smoke-test-inactive-guard\"}")
  BODY=$(cat /tmp/reassign_smoke.json)
  echo "[INFO] reassign inactive guard status: $HTTP_CODE"
  echo "[INFO] reassign inactive guard body: $BODY"
else
  echo "[WARN] reassign inactive guard: skipped (missing requester job or inactive assignee)"
fi

HEALTH=$(curl -sS "http://localhost:3000/health")
echo "[INFO] health: $HEALTH"
