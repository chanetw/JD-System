# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Install & Run:**
```bash
# Backend (Node.js + Express)
cd backend/api-server
npm install
npm run dev                    # Starts on http://localhost:3000

# Frontend (React + Vite)
cd frontend
npm install
npm run dev                    # Starts on http://localhost:5173

# Environment Setup
cp backend/api-server/.env.example backend/api-server/.env
# Update DATABASE_URL and other env vars as needed
```

**Key URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

---

## Architecture Overview

### Big Picture
**DJ System** is a Design Job management platform with workflow approval, SLA tracking, and real-time notifications. The system uses a **hybrid architecture**: V2 API layer running over a V1 database schema (via PrismaV1Adapter pattern).

```
Frontend (React 18 + Vite)
    ↓ REST API + Socket.io
Backend (Express + Prisma ORM)
    ↓ PrismaV1Adapter (transforms V2 → V1)
Database (PostgreSQL with V1 schema)
```

### Why This Architecture?
During migration planning, the team decided to:
1. Keep the V2 auth system API layer (modern, role-based)
2. Continue using V1 database tables (proven, stable, production data)
3. Use PrismaV1Adapter to bridge the gap (minimal risk, maximum compatibility)

This allows new auth features without disrupting existing data or business logic.

### Core Concepts

**Tenancy Model:**
- Multi-tenant system: Each customer (SENA Marketing) is a tenant
- Tenant ID is the primary filter for all queries
- All users, jobs, roles are scoped to a tenant

**User Roles (V1 Standard):**
- **Admin**: System administrator, manages job types, approval flows, holidays
- **Requester**: Marketing team member, creates jobs
- **Approver**: Manager/Team Lead, approves jobs
- **Assignee**: Designer/Developer, receives and completes jobs

**Job Relationships:**
- **Parent Jobs**: Main design request with multiple deliverables
- **Child Jobs**: Sequential or dependent jobs (chaining system)
- **BUD Assignments**: Job Type assignments at Business Unit Division level
- **Project Assignments**: Assign users to specific projects

---

## Frontend Architecture

### Module System (Code Splitting + Dynamic Routing)

The frontend uses a **module registry pattern** to organize features:

```
frontend/src/modules/
├── core/                    # Core: Auth, Layout, Stores
├── shared/                  # Shared: Components, Services, Utils
└── features/
    ├── job-request/         # Create job workflow
    ├── job-management/      # Job detail, approval flow, comments
    ├── admin/               # Admin panels (job types, holidays, etc.)
    ├── assignee/            # Assignee dashboard
    ├── analytics/           # Reports and analytics
    ├── dashboard/           # Main dashboard
    └── portals/             # User & Media portals
```

**How It Works:**
1. Each feature module exports `routes` array in its `index.jsx`
2. `moduleRegistry.js` imports all routes and flattens them
3. `App.jsx` loops through registered modules and creates `<Route>` elements automatically
4. Routes are **lazy-loaded** via `React.lazy()` for code splitting

**Key Files:**
- [frontend/src/moduleRegistry.js](frontend/src/moduleRegistry.js) - Central route registry
- [frontend/src/App.jsx](frontend/src/App.jsx) - Root component with Layout
- [frontend/src/modules/core/layout/](frontend/src/modules/core/layout/) - Main layout with sidebar + header

### State Management

**Zustand Stores:**
- [authStoreV2](frontend/src/modules/core/stores/authStoreV2.ts) - V2 auth with role-based access
- Module-specific stores (e.g., in job-management, admin)

**API Communication:**
- [httpClient](frontend/src/modules/shared/services/httpClient.js) - Axios wrapper with JWT auth
- [apiService](frontend/src/modules/shared/services/apiService.js) - Centralized API methods
- Service modules: [userService](frontend/src/modules/shared/services/modules/userService.js), [fileUploadService](frontend/src/modules/shared/services/modules/fileUploadService.js), etc.

### Real-time Features

- [socketService](frontend/src/modules/shared/services/socketService.js) - Socket.io client
- [useRealtime hook](frontend/src/modules/shared/hooks/useRealtime.js) - React hook for live updates
- Notifications are pushed via Socket.io when jobs change

---

## Backend Architecture

### Entry Point
[backend/api-server/src/index.js](backend/api-server/src/index.js) - Sets up Express, Socket.io, routes, middleware

**Key Middleware:**
- CORS configuration (allows localhost:5173)
- Body parser (JSON, 10MB limit)
- Socket.io with JWT authentication

### Routes Structure
```
backend/api-server/src/routes/
├── auth.js                  # Login, logout, token refresh (V1)
├── users.js                 # User management, assignments
├── jobs.js                  # Create, read, update job workflow
├── job-types.js             # Job type CRUD
├── approval-flows.js        # Approval flow templates
├── approvals.js             # Approval actions (approve/reject)
├── comments.js              # Job comments with @mention support
├── activities.js            # Job activity log
├── master-data.js           # Combined job types, approval flows, BUDs, projects
├── master-data-combined.js  # ⚡ Performance: Single endpoint (6-7 calls → 1)
├── analytics.js             # Analytics tracking
└── v2/ (V2 auth routes)     # /api/v2/auth/*, /api/v2/users/*
```

### PrismaV1Adapter Pattern (Key Architecture)

Located: [backend/api-server/src/v2/adapters/PrismaV1Adapter.js](backend/api-server/src/v2/adapters/PrismaV1Adapter.js)

**Problem Solved:**
- V2 auth expects tables: `v2_users`, `v2_organizations`, `v2_roles`
- Real database uses: `users`, `departments`, `user_roles`, `roles`

**Solution:**
The adapter translates queries and responses:
- `findUserByEmail()` queries V1 `users` table, returns V2-format user object
- `tov2User()` converts V1 user data to V2 auth format
- Role mapping: Normalizes legacy V1 role names (SuperAdmin → Admin, TeamLead → Approver)

**Why Important:**
- All new auth features use V2 auth system
- But actual data stays in proven V1 tables
- Zero risk to production data integrity

### Service Layer

Business logic is in service modules:
- [jobService](backend/api-server/src/services/jobService.js) - Job creation, SLA calculation, status workflows
- [approvalService](backend/api-server/src/services/approvalService.js) - Approval chain logic
- [userService](backend/api-server/src/services/userService.js) - User queries, role assignment
- [cacheService](backend/api-server/src/services/cacheService.js) - Caching layer for performance
- [notificationService](backend/api-server/src/services/notificationService.js) - Notification dispatch
- [emailService](backend/api-server/src/services/emailService.js) - Email templates and sending

### Socket.io Real-time System

**Authentication:**
- [socket/middleware/auth.js](backend/api-server/src/socket/middleware/auth.js) - JWT verification on connection

**Event Handlers:**
- [socket/handlers/jobEvents.js](backend/api-server/src/socket/handlers/jobEvents.js) - Job updates, approvals
- [socket/handlers/notificationEvents.js](backend/api-server/src/socket/handlers/notificationEvents.js) - Notification delivery

**Room System:**
- Personal room: `tenant_{tenantId}:user_{userId}` - User receives notifications here
- Broadcast rooms for real-time updates

---

## Database Schema (Prisma + PostgreSQL)

Key models in [backend/prisma/schema.prisma](backend/prisma/schema.prisma):

**Core Tables:**
- `users` - User accounts (V1 auth, used by V2 adapter)
- `roles` - Role definitions
- `user_roles` - User-role assignments
- `tenants` - Multi-tenant isolation
- `buds` - Business Unit Divisions
- `projects` - Marketing projects
- `job_types` - Design job types with SLA

**Job Workflow:**
- `jobs` - Design jobs (main table, ~20 fields)
  - Status flow: draft → submitted → pending_approval → approved → assigned → in_progress → completed
  - Parent/child relationships for job chaining
  - SLA tracking with working days calculation
- `job_briefs` - Job requirements and specifications
- `job_attachments` - Input files
- `job_deliverables` - Output files
- `job_comments` - Chat/Comments with @mention support
- `job_activities` - Audit log of all changes

**Approval System:**
- `approval_flows` - Approval chain templates (multi-level, multi-approver per level)
- `approvals` - Actual approvals for a job (tracks approval history)

**Admin Config:**
- `holidays` - Working day exceptions
- `notifications` - Delivery logs
- `audit_logs` - System audit trail

**Assignments:**
- `bud_job_assignments` - Assign job types to BUDs
- `project_job_assignments` - Assign users to projects
- `user_scope_assignments` - Fine-grained user access control

---

## Common Commands

### Development

```bash
# Backend
cd backend/api-server
npm run dev                          # Start dev server with hot reload
npm run build:v2                     # Compile TypeScript (V2 auth)
npm run test                         # Run tests: node --test src/**/*.test.js

# Frontend
cd frontend
npm run dev                          # Start Vite dev server
npm run build                        # Production build
npm run lint                         # Run ESLint
npm run preview                      # Preview production build locally

# Database (Prisma)
cd backend/prisma
npx prisma migrate dev --name <name> # Create and apply migration
npx prisma db push                   # Sync schema to database
npx prisma studio                    # GUI database browser (localhost:5555)
npx prisma generate                  # Regenerate Prisma client
```

### Debugging

```bash
# Check backend health
curl http://localhost:3000/health

# Check API version
curl http://localhost:3000/api/version

# Test Socket.io connection
# (Use browser console or Socket.io client library)

# Database connection test
# Check .env DATABASE_URL, then:
psql $DATABASE_URL -c "SELECT version();"

# View Prisma logs
# Add to .env: DEBUG=prisma:*
```

### Testing

```bash
# Test a specific API route
npm test -- src/routes/jobs.test.js

# Run all tests
npm test

# Note: Current tests minimal; add as needed
```

---

## Key Architectural Patterns

### 1. **Tenant Scoping**
Every query filters by `tenantId`:
```javascript
const job = await prisma.job.findUnique({
  where: { id: jobId, tenantId: userId.tenantId }  // Crucial for security
});
```

### 2. **Role-Based Authorization**
User roles determine features (check [permission.utils.js](frontend/src/modules/shared/utils/permission.utils.js)):
- Admin: All features
- Approver: Can approve/reject/comment
- Requester: Can create/view own jobs
- Assignee: Can view assigned, update progress, comment

### 3. **Master Data Optimization**
Most API calls fetch shared data (job types, approval flows, BUDs, projects):
- **Old pattern**: 6-7 separate calls → slow initial load
- **New pattern**: [master-data-combined.js](backend/api-server/src/routes/master-data-combined.js) - Single `/api/master-data-combined` call → 70% faster

### 4. **Service Layer for Business Logic**
Controllers call services, not queries directly:
```javascript
// routes/jobs.js
const jobService = new JobService();
await jobService.createJob(data, userId, tenantId);  // Service handles validation, SLA, notifications
```

### 5. **Activity Tracking**
All job changes logged to `job_activities` for audit trail and UI timeline.

---

## Important Notes for Development

### ⚠️ Database Schema Issues (Known)
- **V2 Tables Remnant**: Tables `v2_users`, `v2_organizations`, `v2_roles` exist in schema but are NOT used
  - Migration files 010, 011 were created but never executed
  - Can be safely deleted (36 total records, no production data)
  - Recommendation: Drop when schema is cleaned up

- **Parent Job Filtering**: Some projects have `isParent` as numeric 1 instead of boolean true
  - Filters check both: `isParent !== true && isParent !== 1`
  - Applies to: UserManagement BUD assignment UI, job list filtering

### 🎯 Recent Implementations (Reference)
- **BUD-Level Assignments**: 2-column UI in UserManagement for assigning job types to BUDs
- **Approval Flow Display**: Timeline visualization in JobDetail showing approval hierarchy
- **Parent Job Assignees**: Aggregates all child job assignees with deduplication
- **Brief Link Support**: External URL field for job requirements
- **Job Chaining**: Sequential job dependencies (A→B→C with max depth control)

### 🚀 Performance Optimizations
- Master data combined endpoint (6-7 API calls → 1)
- Database indexes on frequently queried columns
- Client-side caching for static data
- Pagination on large lists (jobs, comments)

### 📝 Naming Conventions
- **Database**: snake_case (users, job_types, job_activities)
- **Prisma Models**: PascalCase (User, JobType, JobActivity)
- **Frontend**: camelCase (jobType, jobActivity, userId)
- **Files**: kebab-case (job-types.js, user-scope.jsx)

### 🔐 Authentication Flow
1. **Login**: POST /api/v2/auth/login → Returns JWT token + user data
2. **Token Storage**: Saved in Zustand store (authStoreV2)
3. **API Calls**: JWT added to Authorization header via httpClient
4. **Socket.io**: JWT passed in handshake auth, verified by middleware
5. **Role Check**: Frontend uses RoleProtectedRoute, backend validates in each route

---

## Common Issues & Solutions

**Issue: Database connection error**
- Check `.env` DATABASE_URL is correct
- Ensure PostgreSQL is running
- Run `psql $DATABASE_URL -c "SELECT 1;"` to test

**Issue: CORS error from frontend**
- Check `ALLOWED_ORIGINS` in `.env` includes http://localhost:5173
- Restart backend after .env changes

**Issue: Socket.io not connecting**
- Check JWT token is valid
- Check browser console for handshake errors
- Socket.io middleware will disconnect invalid tokens

**Issue: Prisma client out of sync**
- Run `npx prisma generate`
- Delete `node_modules/.prisma` and reinstall

**Issue: V2 auth endpoints 404**
- V2 routes must be mounted BEFORE /api comments route (check index.js line 271)
- Order: /api/v2 → /api/comments → /api/activities

---

## File Structure Overview

```
DJ-System/
├── backend/
│   ├── api-server/
│   │   ├── src/
│   │   │   ├── index.js                 # Server entry point
│   │   │   ├── routes/                  # API endpoints
│   │   │   ├── services/                # Business logic
│   │   │   ├── v2/                      # V2 auth system
│   │   │   ├── socket/                  # Real-time handlers
│   │   │   └── config/                  # Database, Supabase config
│   │   └── .env.example                 # Env template
│   └── prisma/
│       └── schema.prisma                # Database schema (Prisma ORM)
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                     # Vite entry point
│   │   ├── App.jsx                      # Root component + routing
│   │   ├── moduleRegistry.js            # Dynamic route registry
│   │   ├── modules/
│   │   │   ├── core/                    # Auth, Layout, Stores
│   │   │   ├── shared/                  # Common components, services
│   │   │   └── features/                # Feature modules (job-management, admin, etc.)
│   │   └── index.css                    # TailwindCSS import
│   └── index.html                       # HTML template
│
├── database/
│   └── migrations/                      # SQL migration files
│
└── docs/
    └── (Various documentation files)
```

---

## References & Docs

- **README.md** - Project overview and tech stack
- **Prisma Docs**: https://www.prisma.io/docs (ORM, migrations)
- **Tailwind Docs**: https://tailwindcss.com (CSS framework)
- **React Router**: https://reactrouter.com (Frontend routing)
- **Zustand**: https://github.com/pmndrs/zustand (State management)
- **Socket.io**: https://socket.io/docs (Real-time communication)
