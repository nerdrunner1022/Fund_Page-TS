# Zahira College Trincomalee – Land Fund

A single-page, bilingual (English / Tamil) crowdfunding page built from the supplied
HTML prototype. It uses React + Tailwind CSS on the front end and a NestJS + PostgreSQL
API on the back end. **The site does not collect money**: visitors transfer to the bank
account, then send their slip on WhatsApp. The API only records a declaration; an admin
confirms it after checking the slip, or records a transfer already seen on the bank
statement. Only verified donations count towards the public total. Neon is the single
source of truth: the browser never connects to it directly.

## Quick start

Requirements: Node.js 20+ and a PostgreSQL database (local Docker or Neon).

```powershell
copy .env.example .env
# Edit .env: set a real JWT_SECRET and ADMIN_PASSWORD.
docker compose up -d db   # skip if using a hosted database such as Neon
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

### Neon

The repo is linked to a Neon project via `.neon` and `neon.ts`. `neon deploy`
pulls `DATABASE_URL` (pooled) plus `DATABASE_URL_UNPOOLED` (direct) into `.env`.
The running API uses the pooled URL; `db:migrate` and `db:seed` use the direct
URL because Neon's PgBouncer does not support session-scoped migration state.
Keep `JWT_SECRET`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` — Neon does not
generate those. `READONLY_DATABASE_URL` holds the pooled URL of the `zahira_readonly`
role used by the public totals endpoint; it was created with
`neon roles create --name zahira_readonly --access read_only --database neondb` and
then narrowed to only the columns that query needs (see
`apps/api/src/database/readonly-role.sql`). If unset, the pooled application URL is used.

- Web: http://localhost:5173
- Admin review: http://localhost:5173/admin
- API: http://localhost:3000/api
- Health check: http://localhost:3000/api/health

Set `VITE_API_URL` in `apps/web/.env` if the API is not at `http://localhost:3000/api`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start API and web together with hot reload |
| `npm run build` | Type-check and build both apps |
| `npm run typecheck` | Type-check both apps |
| `npm test` | API unit + e2e tests and web unit tests |
| `npm run db:migrate` | Apply checked-in TypeORM migrations |
| `npm run db:seed` | Insert/update the campaign and the admin user (idempotent) |

Automated tests do not need Docker: the e2e suite injects a fresh `pg-mem` database.

## API

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | public | Liveness check |
| `GET` | `/api/campaigns/:slug` | public | Campaign copy, totals and countdown deadline |
| `POST` | `/api/campaigns/:slug/donations` | public | Create a **pending** declaration and reference code (rate limited) |
| `GET` | `/api/campaigns/:slug/donations/totals` | public | Only `{ raised, donors }` for verified donations; cached 30s |
| `GET` | `/api/campaigns/:slug/donations` | public | Verified donations as `{ id, amountMinor, confirmedAt }`, cursor paginated |
| `POST` | `/api/admin/auth/login` | public | Exchange admin credentials for a JWT |
| `GET` | `/api/admin/campaigns/:slug/donations` | JWT | List donations by status, including bank ref and slip link |
| `POST` | `/api/admin/campaigns/:slug/donations` | JWT | Add a verified transfer from the bank statement or WhatsApp slip |
| `POST` | `/api/admin/donations/:id/confirm` | JWT | Verify slip outside the app, then count the donation (once only) |
| `POST` | `/api/admin/donations/:id/decline` | JWT | Reject a pending declaration |
| `PATCH` | `/api/admin/donations/:id` | JWT | Edit any donation; amount/status changes adjust the campaign total transactionally |
| `DELETE` | `/api/admin/donations/:id` | JWT | Delete a donation and reverse its confirmed contribution |

Money is stored as `bigint` minor units and returned as **strings** so amounts above
JavaScript's safe integer range cannot be corrupted. Donations are limited to
Rs. 1 – Rs. 10,000,000. Confirmation uses a conditional status update inside a
transaction, so concurrent requests cannot double-count a donation. `bank_ref` is
unique, so the same bank transfer cannot be entered twice.

## Admin review

Visit `/admin` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The screen has three
tabs (Pending / Verified / Rejected) with full CRUD: add a transfer seen on the People's
Bank statement or a WhatsApp slip, read every field from the list, **Edit** any record
(amount, status, donor, bank ref, date, slip link, message), and **Delete** it after an
inline confirmation. Amount or status edits reverse and reapply the contribution in one
transaction, so public totals stay correct. Each edit records the admin email in
`verified_by` as a lightweight audit trail. The JWT is kept in session storage and checked
by a guard on **every** admin request. CSV import is intentionally not included; enter
statement rows with their bank reference so duplicates are blocked.

On phones the review table becomes labelled cards and the manual/edit forms stack in one
column; on wide screens the page uses the full viewport with bank details and the donation
form side by side.

The public page reads `GET .../donations/totals` on load and every 30 seconds and derives
"Still needed", the percentage and the land blocks from the Rs. 48,000,000 goal. It never
receives donor names, slip links or bank references.

## Security notes

- JWT secret, admin credentials and CORS origins are validated at startup; no secrets are committed.
- Helmet security headers, a strict CORS allowlist, rate limiting on declarations and login,
  Zod validation on every external input, and a sanitised global error response are enabled.
- Passwords are hashed with bcrypt; missing-user logins do the same bcrypt work to prevent
  email enumeration. Reference codes are generated with `crypto.randomInt`.
- `synchronize` and the in-memory database are rejected in production; schema changes go
  through migrations. Set `TRUST_PROXY=true` only behind a single trusted reverse proxy.
- Pagination uses a stable `createdAt|id` keyset cursor so new donations cannot be skipped.
- Public donation responses deliberately exclude donor names, messages, slips and bank refs;
  the totals query can use a SELECT-only Neon role via `READONLY_DATABASE_URL`.
- The totals result is cached in the API for 30 seconds (also sent as `Cache-Control`) so
  periodic browser polling does not hit Neon on every request.

## Deploying to Vercel

The repo is prepared for **two Vercel projects from the same Git repository**:

| Vercel project | Root Directory | Framework preset | What it serves |
| --- | --- | --- | --- |
| `zahira-web` | `apps/web` | Vite | The static bilingual site, including `/admin` |
| `zahira-api` | repository root | Other | The NestJS API as one Node.js function via `api/index.js` |

`vercel.json` at the repository root builds the API and rewrites every `/api/*`
request to the Nest application. `apps/web/vercel.json` adds the SPA rewrite so
`/admin` works on refresh and direct links.

### 1. Push the code

This folder is not yet a Git repository. Initialise it, commit, and push it to
GitHub, GitLab, or Bitbucket before importing it into Vercel. Never commit
`.env`, `.env.production.local`, or any other secret file.

### 2. Create the API project

Import the repository and set **Root Directory** to the repository root. Set
**Framework Preset** to **Other**. The checked-in `vercel.json` supplies the
install command (`npm ci`) and build command (`npm run build --workspace apps/api`).

Add these as **Production** (and, if you want previews, **Preview**) environment
variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string |
| `READONLY_DATABASE_URL` | Pooled connection string for the `zahira_readonly` role |
| `JWT_SECRET` | Fresh random string, at least 32 characters |
| `ADMIN_EMAIL` | Admin sign-in email |
| `ADMIN_PASSWORD` | Strong password, at least 12 characters |
| `CORS_ORIGINS` | Exact public web origin, e.g. `https://fund.example.org` |
| `THROTTLE_LIMIT` | `100` |
| `TRUST_PROXY` | `true` (Vercel is the trusted proxy) |
| `DB_SYNCHRONIZE` | `false` |
| `USE_MEMORY_DB` | `false` |

`NODE_ENV=production` and `PORT` are supplied by Vercel; do not override them.
Startup validation rejects localhost CORS origins, `synchronize`, and the
in-memory database in production.

Deploy once, then copy the generated API domain (for example
`https://funding-page-api.vercel.app`).

### 3. Run migrations and seed against Neon

These commands run locally but use the production values from Vercel:

```powershell
npx vercel@latest login
npx vercel@latest link          # choose the zahira-api project
npx vercel@latest env pull .env.production.local --environment=production
npm ci
npm run db:migrate
npm run db:seed                 # idempotent; safe to rerun
```

`.env.production.local` is gitignored and read by the migration/seed scripts.
If you rotate the seeded admin password later, delete that admin row in Neon and
rerun `npm run db:seed`; the seed never overwrites an existing admin.

### 4. Create the web project

Import the same repository again and set **Root Directory** to `apps/web`.
`apps/web/vercel.json` keeps the Vite preset, installs from the root lockfile,
builds with `npm run build --workspace=@fund/web`, and serves `dist`. Leave
**Include files outside the root directory in the Build Step** enabled so that
the web build can reach the root lockfile.

Add this build-time environment variable:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | The API domain plus `/api`, e.g. `https://funding-page-api.vercel.app/api` |
| `VITE_CAMPAIGN_SLUG` | Optional; defaults to `zahira-college-land-fund` |

`VITE_API_URL` is compiled into the JavaScript bundle, so changing it requires
a redeploy. Deploy, then copy the web domain (for example
`https://funding-page.vercel.app`).

If that web domain differs from the one used in step 2, update `CORS_ORIGINS`
on the API project and redeploy the API.

### 5. Verify the launch

1. `GET https://<api-domain>/api/health` returns `{"status":"ok"}`.
2. `GET https://<api-domain>/api/campaigns/zahira-college-land-fund/donations/totals`
   returns only `{ "raised": "...", "donors": ... }`. Do not publish donor names,
   messages, slips, or bank refs here.
3. Open `https://<web-domain>/` in English and Tamil. Check the countdown,
   Rs. 48,000,000 goal, progress, account number `066-1-001-0-0036343`, WhatsApp
   flow, and browser console.
4. Open `/admin`, sign in, and exercise Verify, Reject, Add, Edit, and Delete.
   Confirm the public total changes correctly and delete any test records.
5. Check 320px, 390px, 768px, and desktop widths for horizontal overflow.

### Custom domains and previews

Add custom domains in the Vercel dashboard, then update `CORS_ORIGINS` (API)
and `VITE_API_URL` (web) to the final URLs and redeploy both projects. For
preview deployments, either copy the production variables into the Preview
environment or add each preview web URL to `CORS_ORIGINS`. The site still does
not collect money or use payment webhooks.
