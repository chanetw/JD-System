# Quick Reference: 502 Job Details Diagnostics

## TL;DR for Operations Team

**Problem**: Users see `502 Bad Gateway` when opening job detail pages (`/jobs/{id}`).

**What to do**:

```bash
# Option 1: Quick snapshot (no interaction needed)
cd /path/to/dj-system
bash scripts/collect-502-diagnostics.sh

# Option 2: Capture live failure (coordinate with user)
# 1. Run this command
bash scripts/collect-502-diagnostics.sh live

# 2. Tell user: "Click job detail page now"
# 3. Script collects logs for 30 seconds
```

**Then**: Share the output file (`diagnostics_*.txt`) with development team.

---

## What Gets Collected

✅ Docker service health  
✅ Backend `/health` endpoint response  
✅ Database connectivity  
✅ Recent backend logs  
✅ Recent frontend logs  
✅ Nginx error log (if available)  
✅ Active database connections  

---

## Common Findings & Quick Fixes

| Finding | Quick Fix | Escalate? |
|---------|-----------|-----------|
| `dj-backend-prod` shows `Unhealthy` or `Exit` | `docker compose restart backend` | Yes, if it doesn't stay up |
| `dj-postgres-prod` shows `Unhealthy` | `docker compose restart postgres` | Yes, check logs for data corruption |
| Backend logs show `TIMEOUT` or `query took > 120s` | Normal but slow—escalate for query optimization | Yes |
| Nginx error shows `upstream timed out` | Backend responding slower than 120s proxy timeout | Yes |
| Nginx error shows `host not found in upstream "backend"` | Docker DNS issue—restart frontend: `docker compose restart frontend` | Yes, if repeats |
| Backend health check returns `{"status":"ok"}` | Likely intermittent or specific to certain job IDs | Yes, escalate with job ID |
| Database shows 100+ connections (unusual high) | Connection pool exhausted—check for hung queries | Yes, likely DoS or leak |

---

## Detailed Troubleshooting

For more comprehensive diagnostics and interpretation, see:  
📄 **[TROUBLESHOOTING_502_JOBS_DETAIL.md](./TROUBLESHOOTING_502_JOBS_DETAIL.md)**

That guide includes:
- Browser-side diagnostics (no server access needed)
- Step-by-step verification flow
- Scenario analysis (which request is actually failing?)
- Full decision tree

---

## When to Escalate

**Immediately escalate to dev team with the diagnostics file** if:

1. Backend container status is `Exit` or `Unhealthy` and won't recover with restart
2. Postgres shows connection errors
3. Backend logs show application crashes (panic, exception, out of memory)
4. Nginx logs show repeated `upstream timed out` (query performance issue, not config)
5. Database has 100+ active connections or deadlock errors
6. Issue is intermittent or affects only certain job IDs (data-specific)

**Safe to restart for quick recovery**:
- Frontend container: `docker compose restart frontend`
- Backend container: `docker compose restart backend` (but send logs to dev first if it was unhealthy)

---

## Useful Commands (manual checks)

```bash
# Check all service health
docker compose -f docker-compose.prod.yml ps

# Test backend directly
curl http://localhost:3000/health

# Test the failing endpoint (with valid JWT)
TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/jobs/1

# Follow logs in real-time
docker logs -f dj-backend-prod

# Check database
docker exec dj-postgres-prod psql -U postgres -d dj_system -c "\l"
```

---

## File Locations

| File | Purpose |
|------|---------|
| [docs/TROUBLESHOOTING_502_JOBS_DETAIL.md](./TROUBLESHOOTING_502_JOBS_DETAIL.md) | Full troubleshooting guide (browser + server) |
| [scripts/collect-502-diagnostics.sh](../scripts/collect-502-diagnostics.sh) | Automated diagnostics collector |
| [docker-compose.prod.yml](../docker-compose.prod.yml) | Production deployment config |
| [frontend/nginx.conf](../frontend/nginx.conf#L40) | Nginx proxy timeout settings (120s for `/api/`) |
| [backend/api-server/src/routes/jobs.js#L1566](../backend/api-server/src/routes/jobs.js#L1566) | Backend GET /api/jobs/:id route (where data is fetched) |

