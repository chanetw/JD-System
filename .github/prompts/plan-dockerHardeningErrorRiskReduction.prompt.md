---
name: plan-docker-hardening-error-risk-reduction
description: "Plan: Docker Hardening + Error Risk Reduction — phased rollout to harden Docker deployments: preflight checks, runtime hardening, data/schema safety, observability, and controlled canary release."
description_th: "แผน: Docker Hardening + ลดความเสี่ยงข้อผิดพลาด — แนวทาง phased rollout เพื่อเพิ่มความเสถียรของการ deploy ด้วย preflight checks, runtime hardening, ความปลอดภัยของ schema, การมองเห็น (observability) และการเปิดใช้งานแบบ canary ที่ควบคุมได้"
---

## Plan: Docker Hardening + Error Risk Reduction

เป้าหมายคือทำ Docker project ของ DJ System ให้ deploy ได้เสถียร, ตรวจจับปัญหาเร็ว, และลดโอกาส error บน production โดยใช้แนวทาง phased rollout: baseline → hardening → verification → controlled release. แนวทางนี้เน้นแก้จุดเสี่ยงจริงที่พบแล้วใน repo (migration race, env drift, nginx upstream timeout, Prisma client path) ก่อนทำ optimization เพิ่มเติม.

**Steps**
1. Phase 1: Baseline และ Scope Lock (สัปดาห์ 1)
   - สรุป current-state deployment flow จาก compose, Dockerfile, entrypoint, deploy scripts และ env templates เพื่อทำเป็น source of truth เดียว
   - กำหนดขอบเขต rollout: dev parity, staging gate, production cutover, rollback owner
   - นิยาม SLO เบื้องต้นที่ต้องผ่านก่อน deploy (backend health, API latency threshold, migration success, zero crash loop)
2. Phase 2: Preflight Guardrails (depends on 1)
   - เพิ่ม pre-deploy validation ใน scripts/deploy-docker.sh: required env checks, docker compose config validation, network/volume readiness, image/tag integrity
   - เปลี่ยน flow รอ Postgres จาก fixed sleep เป็น health-based wait พร้อม timeout และ clear fail reason
   - บังคับ migration gate: ถ้า prisma migrate deploy fail ให้หยุด deploy (หรือ allow override แบบ explicit flag)
3. Phase 3: Runtime Hardening (depends on 2)
   - Backend entrypoint hardening: required env validation, structured startup logs, deterministic exit codes
   - Nginx hardening: upstream timeout policy แยก API/Socket, fallback handling, access/error log structure, custom error signal for 502 triage
   - Compose hardening: resource limits, restart policy review, healthcheck tuning (start_period/interval/retries) ให้สอดคล้อง cold start จริง
4. Phase 4: Data/Schema Safety (parallel with 3 after 2)
   - สร้าง migration safety checklist: backup-before-migrate, schema drift detection, required tables/columns assertions
   - ปิดความเสี่ยง Prisma client generation path mismatch โดยทำ deterministic validation หลัง build
   - กำหนด release contract สำหรับ schema change (DB first vs app first) และ backward-compatible rollout window
5. Phase 5: Observability และ Error Diagnostics (depends on 3,4)
   - รวม health/readiness checks แบบ dependency-aware (DB + critical route checks)
   - จัด runbook incident สำหรับ 500/502/SMTP/config drift พร้อมคำสั่งตรวจสอบมาตรฐาน
   - เพิ่ม deployment report artifact: container status, migration result, top logs, smoke test result
6. Phase 6: Verification & Go-Live (depends on 5)
   - ทดสอบใน staging ตาม scenario matrix: cold start, restart storm, DB unavailable, missing env, slow query, nginx upstream fail
   - ทำ production canary rollout (backend ก่อน frontend หรือ reverse proxy safe order ตาม impact) พร้อม rollback trigger ชัดเจน
   - หลัง deploy เก็บ post-deploy review และ update runbook/memory เพื่อป้องกัน regression

**Risk analysis (Top risks causing errors)**
1. Critical: Migration race/failed migration but app still starts → 500 from missing schema; Detection: migrate logs + table assertions; Mitigation: strict migration gate + backup + drift check
2. Critical: Env drift/missing secret (JWT, DATABASE_URL, SMTP) → auth/email/API failures; Detection: preflight env audit; Mitigation: required-var validator + secret source policy
3. High: Nginx upstream timeout/resolution issue (`backend` DNS/slow route) → 502; Detection: nginx error log + route latency; Mitigation: timeout policy + query optimization + resolver validation
4. High: Prisma client path mismatch in image build → runtime query failures; Detection: image startup self-check; Mitigation: deterministic build assertion after prisma generate/copy
5. High: No controlled rollback path → prolonged incident; Detection: failed smoke after deploy; Mitigation: one-command rollback + rollback criteria
6. Medium: Container health checks not reflecting dependency health → false healthy; Detection: synthetic endpoint checks; Mitigation: dependency-aware health/readiness checks
7. Medium: Resource starvation (CPU/memory/no limits) → crash/restart loops; Detection: container restarts/OOM logs; Mitigation: compose resource limits + baseline sizing

**Relevant files**
- `/Users/chanetw/Documents/DJ-System/docker-compose.prod.yml` — production service topology, health checks, dependency order, volumes/networks
- `/Users/chanetw/Documents/DJ-System/docker-compose.yml` — development baseline and parity comparison
- `/Users/chanetw/Documents/DJ-System/backend/api-server/Dockerfile` — Prisma generate/copy path, runtime image behavior
- `/Users/chanetw/Documents/DJ-System/backend/api-server/docker-entrypoint.sh` — migration/seed/startup behavior and failure handling
- `/Users/chanetw/Documents/DJ-System/frontend/Dockerfile` — build args, asset packaging, runtime image assumptions
- `/Users/chanetw/Documents/DJ-System/frontend/nginx.conf` — proxy policy, resolver, timeout, static routing, websocket path
- `/Users/chanetw/Documents/DJ-System/scripts/deploy-docker.sh` — deployment orchestration and preflight gap fixes
- `/Users/chanetw/Documents/DJ-System/scripts/verify-deployment.sh` — post-deploy verification baseline
- `/Users/chanetw/Documents/DJ-System/backend/api-server/.env.production` — production env contract and secret completeness
- `/Users/chanetw/Documents/DJ-System/docs/TROUBLESHOOTING_502_JOBS_DETAIL.md` — existing incident diagnostic reference
- `/Users/chanetw/Documents/DJ-System/scripts/collect-502-diagnostics.sh` — operational diagnostics baseline for incidents

**Verification**
1. Preflight validation passes in CI/local: required env complete, compose config valid, migrations discoverable
2. Build validation passes: backend/frontend images build reproducibly; Prisma client path check passes
3. Staging smoke passes: `/health`, critical `/api` endpoints, websocket handshake, static assets, upload path
4. Failure-injection tests pass: missing env, delayed postgres, forced migration fail, nginx upstream timeout simulation
5. Canary deploy passes acceptance window with no spike in 5xx, no restart loops, and rollback test executed at least once

**Decisions**
- Selected scope: ครอบคลุม Dev + Staging + Production parity เพื่อกัน config drift ข้าม environment
- Selected timeline: Quick win 1-2 สัปดาห์ โดย prioritize ความเสี่ยงระดับ Critical/High ก่อน
- Selected secret strategy (phase นี้): ใช้ `.env.production` ต่อ แต่บังคับ preflight validation และ required-var checks
- Excluded scope: Application feature logic changes unrelated to container/deployment reliability
- Assumption: ใช้ Docker Compose เป็น deployment orchestrator หลัก (ไม่ย้ายไป Kubernetes ในแผนนี้)

**Further Considerations**
1. Release strategy: Option A single-shot deploy / Option B canary by service (แนะนำ B เพื่อลด blast radius)
2. Verification ownership: Option A Dev owner เดียว / Option B Dev+Ops signoff คู่ (แนะนำ B เพื่อกัน blind spot)
