# Troubleshooting 502 Bad Gateway - Job Details Page

**Problem**: Opening job detail pages returns `502 Bad Gateway` from nginx.  
**Scope**: Affects ALL job detail pages.  
**Status**: Inbox pending root cause determination.

---

## Phase 1: Browser-Based Diagnostics (No Server Access Required)

**Goal**: Determine if failure is in document route (`/jobs/:id`), API route (`/api/jobs/:id`), or upstream proxy.

### Step 1.1: Open DevTools and Capture One Failing Load

1. Open production environment in browser
2. Press `F12` → go to **Network** tab
3. Check "Disable cache" checkbox
4. **Clear** existing network history (Ctrl+Shift+Delete or button)
5. Navigate to job details page (note which entry point: Link, button, or `<a href>`)
6. Wait until page fully loads or error shows
7. **DO NOT CLOSE DevTools** — take screenshots or notes from Network tab

### Step 1.2: Identify Which Request Failed

Look at the **Network tab** in this order:

| Request Type | Status | What It Means |
|---|---|---|
| Document GET `/jobs/{id}` | **502** | ❌ Problem in frontend nginx, upstream proxy, or document serving |
| Document GET `/jobs/{id}` | **200** | ✅ Document loads OK; check next row |
| XHR/Fetch GET `/api/jobs/{id}` | **502** | ❌ Problem in backend API route or proxy chain |
| XHR/Fetch GET `/api/jobs/{id}` | **200** | ✅ API works; check if page renders |

**⚠️ Critical observation**: 
- If document `/jobs/{id}` shows `502`, screenshot the **Response** tab (usually just "nginx" or error page)
- Note the **response time** (how long did it take to fail?)
- Check **Request Headers** for any custom headers or redirects

### Step 1.3: Determine Entry Point

**Why this matters**: Some parts of the UI use `<a href="/jobs/:id">` (full page load) vs. React `Link` (SPA navigation). Different entry points reveal different failures.

| Where You Came From | Link Type | Implication |
|---|---|---|
| Job List (DJList page) | React `<Link>` | SPA navigation → if fails, it's React/API client issue |
| Dashboard | `<a href>` | Full page load → if fails, could be nginx/reverse proxy |
| Rejection Badge | `<a href>` | Full page load → if fails, could be nginx/reverse proxy |
| Notification Card | `navigate()` | Client-side → SPA navigation issue |

**How to check**: Look at DevTools **Initiator** column for the request. If it says "navigation", it's a full page load.

### Step 1.4: Compare Against a Working Endpoint

Test another endpoint in the same session to isolate:

```
1. From the same browser, test jobs LIST page
   - Try: GET /jobs → should show list (JS loads, then API calls /api/jobs)
   
2. Check Network for /api/jobs endpoint
   - If /api/jobs works, but /api/jobs/{id} fails → backend route-specific issue
   - If both fail → backend-wide issue or auth problem
   
3. Try another feature in /api (e.g., get master data, users list)
   - If those work → isolated to GET /api/jobs/:id route
```

### Step 1.5: Check Authentication

From DevTools, go to a **successful** /api request and verify:

- **Request Headers** has `Authorization: Bearer <token>` 
- **token value**: Should start with `eyJ` (JWT format)
- **localStorage**: Open Console and run:
  ```javascript
  console.log('V2 token:', localStorage.getItem('auth_token_v2'));
  console.log('V1 token:', localStorage.getItem('token'));
  ```
  At least one should be set.

**Why**: If /api/jobs/{id} fails with `502` but request has no token, it might be auth validation before query.

---

## Phase 2: Server-Side Diagnostics (If you have production access)

### Step 2.1: Run Quick Health Check (No logs needed)

```bash
# From host machine or jump box, test directly
docker compose -f docker-compose.prod.yml ps

# Shows which containers are UP or unhealthy
# Expected: frontend UP, backend UP (healthy), postgres UP (healthy)
```

**If unhealthy**: Stop here, fix container health first.

### Step 2.2: Capture One Failing Request Logs

**Timing is important**: Coordinate with user to:
- Note exact timestamp when they click job detail (e.g., "15:32:45 UTC")
- You collect logs DURING or IMMEDIATELY AFTER that click

```bash
# Collect backend logs (last 100 lines, follow as they click)
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Or collect with timestamps for past 5 minutes
docker logs dj-backend-prod --since 5m 2>&1 | grep -A5 -B5 "jobs/"
```

### Step 2.3: Check Nginx Error Log (if container stores it)

```bash
# Test if frontend container has accessible error log
docker exec dj-frontend-prod cat /var/log/nginx/error.log 2>/dev/null | tail -50

# Or check if errors go to stdout
docker logs dj-frontend-prod 2>&1 | grep -i "error\|upstream"
```

### Step 2.4: Verify Backend Health Endpoint

```bash
# Direct health check (simulates what Docker healthcheck does)
curl -s http://localhost:3000/health | jq .

# Should return JSON like:
# { "status": "ok", "database": "connected" }

# Test the actual failing route with a real token
TOKEN="<valid-jwt-from-browser>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/jobs/1 | head -50

# Note: Returns JSON or 502 error page
```

### Step 2.5: Check Database Connectivity

```bash
# Can backend see the database?
docker exec dj-backend-prod wget -qO- http://localhost:3000/health

# Can database accept queries?
docker exec dj-postgres-prod pg_isready -U postgres -d dj_system
# Should return: accepting connections
```

---

## Phase 3: Interpreting Results

### Scenario A: Document Request `/jobs/:id` Returns 502

**Symptom**: Network tab shows `GET /jobs/1` → `502 Bad Gateway` as first request.

**Root causes**:
1. Frontend container crashed or unhealthy
2. Reverse proxy (if exists) between browser and nginx not responding
3. nginx can't reach backend on `/socket.io` during SPA bootstrap (DNS, network)
4. Very slow backend making frontend timeout (nginx default timeout)

**Next steps**:
1. Check `docker compose ps` → is frontend container `Up`?
2. Check frontend logs: `docker logs dj-frontend-prod`
3. Check if this happens only with specific entry point (`<a href>` vs. `Link`)
4. If intermittent: might be TCP/DNS race condition → check docker network

### Scenario B: Document `/jobs/:id` Works (200) But `/api/jobs/:id` Returns 502

**Symptom**: Document returns `200 OK` with React app loaded, but async fetch to `/api/jobs/{id}` fails with `502 Bad Gateway`.

**Root causes** (from most to least likely):
1. Query takes too long, nginx times out before backend responds (120s timeout in [frontend/nginx.conf](../../frontend/nginx.conf#L40))
2. Backend route handler crashes or hangs (large Prisma include tree in [backend/api-server/src/routes/jobs.js](../../backend/api-server/src/routes/jobs.js#L1566))
3. Auth/RLS middleware fails on this route (dependency on tenantId, userId in token)
4. Approval flow service call hangs (non-blocking but still slow)

**Next steps**:
1. Check backend logs for request trace around the timestamp
2. Look for: `TIMEOUT`, `queue full`, `connection refused`, or slow query time
3. Test route directly: `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/jobs/1`
4. If slow: check database indices on `jobId` in comments, activities, approvals tables
5. If auth error: verify token has `tenantId` field: `cat token | base64 -d | jq`

### Scenario C: `/api/jobs/:id` Fails But Other `/api/*` Endpoints Work

**Symptom**: Endpoints like `/api/jobs`, `/api/master-data` work fine, but `/api/jobs/{id}` is `502`.

**Root causes**:
1. Route-specific logic error (only in the `GET /:id` handler)
2. Data corruption (job record has orphaned FK or null relation)
3. Specific job's relations are too large (many children, comments, activities)

**Next steps**:
1. Test with different job IDs: does `/api/jobs/2`, `/api/jobs/3` also fail?
2. If one job ID works and another fails → data/relation issue for that specific record
3. Check backend logs for error message (null pointer, FK constraint, etc.)
4. Inspect Prisma query in route — 12 includes might be too much for heavy jobs

### Scenario D: `/api` Endpoints Fail When Accessing Job Detail

**Symptom**: Accessing job detail causes a cascade of `/api/*` failures.

**Root causes**:
1. Backend process crashed mid-request (memory, panic, unhandled exception)
2. Database connection pool exhausted (too many concurrent requests)
3. Approval service deadlock or timeout bringing down whole app

**Next steps**:
1. Check if backend container is still `Up`: `docker compose ps backend`
2. Check backend logs for crash: `docker logs dj-backend-prod | tail -50`
3. Check database: `docker exec dj-postgres pg_stat_activity` (list active queries)
4. If crash: restart backend and check logs: `docker compose restart backend && docker logs -f backend`

---

## Phase 4: Gathering Evidence Checklist

**For non-server scenarios** (browser only):
- [ ] Screenshot of Network tab showing failed request URL and status
- [ ] Response headers of the `502` response
- [ ] Request headers (especially `Authorization`)
- [ ] Timing info (how long did request take?)
- [ ] DevTools Console logs (any JS errors?)
- [ ] Entry point (which button/link was clicked?)

**For server scenarios** (if you have access):
- [ ] Output of `docker compose -f docker-compose.prod.yml ps` at time of failure
- [ ] Backend logs for 30 seconds before and after the failed click
- [ ] Frontend/Nginx logs if frontend container involved
- [ ] Health check results: `curl http://localhost:3000/health`
- [ ] Direct route test: `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/jobs/1`
- [ ] Job record check: does the job ID exist in database?

---

## Quick Decision Tree

```
START
  ↓
Is document /jobs/{id} status 200 or 502?
  ├─ 502 → [SCENARIO A] Frontend/Upstream issue
  │         Check: docker ps, frontend logs, nginx health
  │
  └─ 200 → Is /api/jobs/{id} status 200 or 502?
             ├─ 502 → [SCENARIO B] Backend API issue
             │         Check: backend logs, query perf, token
             │
             └─ 200 → Page should render fine
                       If JS error → Check browser console
                       If blank → Check useEffect in JobDetail.jsx
```

---

## Recommended Handoff to Infrastructure Team

If you can't access production directly, provide ops team with this request:

**Subject**: Need minimal evidence to diagnose 502 on job detail pages

**Timing**: 
- Note exact UTC timestamp when you see the error
- Ask ops to collect logs in 30-second window around that time

**What to collect**:
```bash
# 1. Service health snapshot
docker compose -f docker-compose.prod.yml ps

# 2. One failed request trace (backend logs)
# [time] 15:32:42 +0000; user clicks /jobs/1; 502 error; [time] 15:32:47 +0000
docker logs dj-backend-prod --since 15m 2>&1 | grep -E "jobs/[0-9]|502|ERROR|timeout"

# 3. Health check result
docker exec dj-backend-prod wget -qO- http://localhost:3000/health | jq .

# 4. Database check (is it responding?)
docker exec dj-postgres-prod pg_isready -U postgres -d dj_system
```

**Share with ops**: Reference this [troubleshooting doc](./TROUBLESHOOTING_502_JOBS_DETAIL.md) so they understand the context and what evidence helps.

---

## Reference: Critical Config & Code

| Component | Location | Relevant Setting |
|---|---|---|
| Nginx proxy timeout | [frontend/nginx.conf](../../frontend/nginx.conf#L40) | `proxy_read_timeout 120s;` (API calls have 120 sec window) |
| httpClient timeout | [httpClient.js](../../frontend/src/modules/shared/services/httpClient.js#L8) | `timeout: 60000` (frontend wait is 60 sec) |
| Job detail route | [routes/jobs.js](../../backend/api-server/src/routes/jobs.js#L1566) | 12 Prisma includes + approval flow lookup |
| Hard-nav entry points | [Dashboard.jsx](../../frontend/src/modules/features/dashboard/pages/Dashboard.jsx#L1076), [JobRejectionBadge.jsx](../../frontend/src/modules/features/job-management/components/JobRejectionBadge.jsx#L112) | `<a href="/jobs/{id}">` forces full page load |
| SPA-nav entry points | [DJList.jsx](../../frontend/src/modules/features/job-management/pages/DJList.jsx#L733) | `<Link to="/jobs/{id}">` uses React Router |

---

## Next Steps

1. **Complete Phase 1** (browser diagnostics) — should take 10-15 minutes
2. **Share findings** in this format:
   - "Document request status: `[200/502]`"
   - "API request status: `[200/502]`"
   - "Entry point: `[Link/href/navigate]`"
   - "Other endpoints: `[working/failing]`"
3. **Decide**: Do you need server access, or can browser evidence point to root cause?
4. **Escalate to ops** if needed with specific evidence request (Phase 2 commands)

