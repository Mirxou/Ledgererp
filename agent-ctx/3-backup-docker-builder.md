# Task 3: Backup + Docker Builder

## Work Completed

### 1. Backup API Route (`/api/backup/route.ts`)
- **GET /api/backup** — Triggers SQLite backup with `fs.copyFileSync`
  - Naming: `ledgererp-backup-YYYY-MM-DD-HHmmss.db`
  - Stored in `db/backups/` (auto-created)
  - 1-minute cooldown rate limit
  - Max 10 backups (prunes oldest)
  - Auth required (verifyPiAuth)
- **GET /api/backup?list=true** — Lists all backups with filename, size, date
- **POST /api/backup** — Restore from backup
  - Creates safety backup before restoring
  - Requires manager/admin role (X-User-Role header)
- **DELETE /api/backup** — Deletes specific backup file
  - Filename pattern validation (prevents path traversal)

### 2. Backup UI Component (`backup-view.tsx`)
- Create Backup button
- Backup list with filename, size, date
- Restore button with confirmation dialog
- Delete button with confirmation dialog
- Auto-backup indicator (last backup time)
- Stats: total size, count, last backup age

### 3. Settings Integration
- Added `<BackupView piUid={piUid} />` in settings-view.tsx before danger zone

### 4. Docker Deployment
- **Dockerfile**: Multi-stage build (deps → builder → runner) for bun
- **docker-compose.yml**: Volume mounts for `db/`, health check
- **.dockerignore**: Excludes build artifacts, logs, backups
- **next.config.ts**: Added `output: "standalone"` for Docker
- **CORS**: Added X-User-Role to allowed headers

## API Test Results
- GET /api/backup?list=true → 200 (empty list)
- GET /api/backup → 200 (backup created, 408KB)
- GET /api/backup (no auth) → 401
- DELETE /api/backup → 200 (deleted)
- GET /api/backup (cooldown) → 429
- POST /api/backup (viewer role) → 403
