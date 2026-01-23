# Changelog

## [Unreleased]

### Added
- **Feature:** Job Request UI (`CreateJob.jsx`)
    - Dynamic Job Type & Project dropdowns (fetching from DB).
    - Real-time SLA Due Date calculation using `slaCalculator.js`.
    - Form submission connected to `jobs` table (Supabase).
- **Database:** Created migration script `02_phase2_tables.sql` adding `notifications`, `notification_logs`, and `sla_shift_logs` tables.
- **Logic:** Implemented `slaCalculator.js` utility for calculating working days (skipping weekends & holidays).

## [0.1.0] - 2026-01-23
### Added
- Initial project structure (Modular Architecture).
- Core modules: Auth, Layout, Dashboard.
- Feature modules: Job Request, Job Management, Admin.
