# Cadence — Weekly Report Generator & Team Dashboard

Cadence is a small internal tool for weekly team reporting. Team members file a
structured report each week — tasks with planned/actual progress and hours,
blockers, achievements, a breakdown of where the time went, and a plan for next
week. Managers review those reports, approve them or send them back with a
comment, and read a dashboard over the whole team.

The part worth looking at is the correction cycle. A report is a container; its
content lives on immutable versions. Submitting freezes the version being
edited; requesting changes records the comment **against the version that was
reviewed** and clones it into a fresh editable copy, so the member reopens a
pre-filled form while every earlier version stays readable exactly as it was
reviewed.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router), TypeScript | Route groups map cleanly onto the member/manager split |
| UI | Tailwind CSS 4 + shadcn/ui (Radix) | Accessible primitives, no heavy dependency |
| Data fetching | TanStack Query | Cache invalidation across status transitions needs a real client |
| Forms | React Hook Form + Zod | `useFieldArray` drives the task/blocker/achievement arrays |
| Charts | Recharts | |
| Session state | Zustand | Access/refresh tokens and the current user only |
| Backend | NestJS 12 (ESM) | Module boundaries carry the access-control design |
| ORM | Prisma 7 (multi-file schema) | The schema doubles as the ER diagram source |
| Database | PostgreSQL 16 | The data is strongly relational |
| Tests | Vitest + Supertest | RBAC and the correction cycle are the high-value tests |

## Prerequisites

- Node.js 20+ (developed on 24)
- pnpm 11+
- Docker (for PostgreSQL)

---

## Setup

### 1. Installing dependencies

```bash
git clone <repo-url> cadence
cd cadence
pnpm install
```

### 2. Environment variables

```bash
cp .env.example .env                 # docker compose + database
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

| Variable | App | Notes |
| --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | compose | Credentials for the local Postgres container |
| `DATABASE_URL` | api | Postgres connection string |
| `PORT` | api | Defaults to 3001 |
| `JWT_ACCESS_SECRET` | api | Signs the 15-minute access token |
| `JWT_REFRESH_SECRET` | api | Must differ from the access secret |
| `ACCESS_TOKEN_TTL` | api | Default `15m` |
| `REFRESH_TOKEN_TTL` | api | Default `7d` |
| `CORS_ORIGIN` | api | The web origin, with credentials enabled |
| `INVITATION_TTL_HOURS` | api | How long an invitation link stays valid (default 48) |
| `SMTP_HOST` / `SMTP_PORT` | api | Defaults to Mailpit (`localhost:1025`) |
| `SMTP_FROM` | api | From header for outgoing mail |
| `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | api | Only needed for a real SMTP provider — Mailpit takes neither TLS nor auth |
| `HUGGINGFACE_API_KEY` | api | Server-side only — powers the AI Report Assistant. Needs the "Make calls to Inference Providers" token permission. Leave blank to disable it (returns a friendly 503) |
| `HUGGINGFACE_MODEL` | api | Hugging Face model id, e.g. `Qwen/Qwen3-Next-80B-A3B-Instruct`. Must be served by a provider enabled on your account |
| `NEXT_PUBLIC_API_URL` | web | Where the browser reaches the API |

### 3. Running the database and mail catcher

```bash
docker compose up -d postgres mailpit
```

Mailpit catches every email the API sends locally — invitations included.
View them at [http://localhost:8025](http://localhost:8025); nothing leaves
the machine.

### 4. Running migrations and seeding

```bash
pnpm --filter cadence-api exec prisma migrate deploy
pnpm db:seed
```

The seed is idempotent — it clears and rebuilds the demo data every run.

### 5. Running the backend

```bash
pnpm dev:api          # http://localhost:3001
```

### 6. Running the frontend

```bash
pnpm dev:web          # http://localhost:3000
```

Or both at once with `pnpm dev`.

### Demo accounts

Every account uses the password `Passsword123`.

| Email | Role | What they see |
| --- | --- | --- |
| `admin@demo.com` | ADMIN | User management, invitations, projects |
| `manager@demo.com` | MANAGER | Team dashboard, review, analytics |
| `kasun@demo.com` | MEMBER | Own reports, including one sent back for correction |
| `dilani@demo.com` | MEMBER | Has a report on its third version |
| `ruwan@demo.com`, `amaya@demo.com`, `tharindu@demo.com` | MEMBER | |

Ruwan and Tharindu deliberately have **no** report for the current week, so the
derived "not yet started" state is visible on the dashboard.

---

## Running tests

```bash
pnpm --filter cadence-api test        # unit tests
pnpm --filter cadence-api test:e2e    # RBAC + full correction cycle (needs the database)
```

The e2e specs create and clean up their own users and projects, so they can run
against the seeded database.

---

## Project structure

```
cadence/
├── apps/
│   ├── api/                  # NestJS
│   │   ├── prisma/           # multi-file schema + migrations + seed
│   │   └── src/
│   │       ├── common/       # guards, decorators, filters, week/decimal helpers
│   │       └── modules/      # auth, users, invitations, projects, reports, reviews, analytics
│   └── web/                  # Next.js App Router
│       ├── app/(auth)/       # login, register
│       ├── app/(app)/        # everything behind a session
│       ├── components/       # report/, dashboard/, charts/, ui/
│       └── lib/              # api-client, query-keys, status-config, week helpers
├── packages/shared/          # Zod schemas + types used by the web app
└── docker-compose.yml        # PostgreSQL only; the apps run locally via pnpm
```

## Pages

| Route | Role | Purpose |
| --- | --- | --- |
| `/login`, `/register` | public | Authentication |
| `/invitations/accept/[token]` | public | Accept an emailed invitation |
| `/reports` | MEMBER | Report history, filterable and paginated |
| `/reports/new` | MEMBER | Create a report for a week that has none |
| `/reports/[id]` | MEMBER | Read-only detail with the reviewer's comment |
| `/reports/[id]/edit` | MEMBER | The report form |
| `/team` | MANAGER, ADMIN | Dashboard: metrics, status matrix, report list, activity |
| `/team/reports/[id]/review` | MANAGER, ADMIN | Review with version selector and comment history |
| `/team/members/[id]` | MANAGER, ADMIN | Member profile and statistics |
| `/team/sections` | MANAGER, ADMIN | One section across the whole team for a week |
| `/analytics` | MANAGER, ADMIN | Four charts and the activity feed |
| `/projects` | MANAGER, ADMIN | Project CRUD |
| `/admin/users` | ADMIN | User management and invitations |

## API overview

| Method | Route | Role |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | public |
| GET | `/auth/me` | any |
| GET/POST | `/invitations`, `/invitations/:id/resend`, `/invitations/:id/cancel` | ADMIN |
| GET/POST | `/invitations/validate/:token`, `/invitations/accept` | public |
| GET | `/users`, `/users/:id` | MANAGER, ADMIN |
| POST/PATCH | `/users`, `/users/:id/role`, `/users/:id/status` | ADMIN |
| PATCH/POST | `/users/me`, `/users/me/password` | any (self) |
| GET | `/projects` | any |
| POST/PATCH/DELETE | `/projects`, `/projects/:id` | MANAGER, ADMIN |
| GET/POST | `/reports`, `/reports/:id`, `/reports/:id/content`, `/reports/:id/submit`, `/reports/:id/versions[/:n]`, `/reports/weeks/available` | MEMBER (own only) |
| GET | `/team/reports`, `/team/reports/:id`, `/team/reports/:id/versions/:n`, `/team/status-matrix`, `/team/sections` | MANAGER, ADMIN |
| POST/GET | `/reviews/:reportId/approve`, `/reviews/:reportId/request-changes`, `/reviews/:reportId/history` | MANAGER, ADMIN |
| GET | `/analytics/summary`, `/trends`, `/status-by-member`, `/by-project`, `/time-by-type`, `/activity` | MANAGER, ADMIN |
| POST | `/assistant/report-chat` | MANAGER, ADMIN |

List endpoints return `{ data, page, pageSize, total }`; single resources return
the object directly.

