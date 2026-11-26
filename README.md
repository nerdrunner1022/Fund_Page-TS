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

On Vercel Services the site calls the API at the same-origin path `/api`. For
the split local dev servers, create `apps/web/.env` containing
`VITE_API_URL=http://localhost:3000/api`.

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
| `GET` | `/api/fx/currencies` | public | Currency codes accepted by the donation forms |
| `GET` | `/api/fx/quote?currency=USD&amount=10` | public | Live rate preview only (rate limited, no-store) |
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

## Alternate currencies

Both the public form and the admin add/edit forms accept `LKR`, `USD`, `GBP`, `EUR`,
`AED`, `SAR`, `QAR`, `CAD`, `AUD`, `INR`, `MYR` and `SGD`. The preview calls
`GET /api/fx/quote`, which fetches rates from the fixed URL
`https://open.er-api.com/v6/latest/LKR` (5 second timeout, cached for 10 minutes).
The server repeats the conversion on submission: `amountMinor` is **always LKR**
and is the only value counted towards the campaign, while `currency`,
`sourceAmountMinor` and `fxRate` are stored as audit fields. Conversions use exact
integer arithmetic and are rejected if the rupee result is outside
Rs. 1 – Rs. 10,000,000. The provider URL is hardcoded, so user input cannot be used
for outbound requests. If rates are unavailable, LKR donations still work and the
foreign-currency forms block until a live quote succeeds. Apply
`AddCurrencyConversion1710000000200` with `npm run db:migrate` before deploying code
that writes these columns.

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
- Currency codes are allowlisted by a Zod enum; the rate provider URL is fixed and its
  response is validated. Conversion is rechecked server-side on every write, never
  trusted from the browser preview.

## Deploying to Vercel

The repo is prepared as **one Vercel project with two Services**, sharing one
domain:

| Service | Source root | Framework | Public path |
| --- | --- | --- | --- |
| `api` | `apps/api` | NestJS | `/api/*` |
| `web` | `apps/web` | Vite | Everything else |

The root `vercel.json` defines both services, routes `/api/(.*)` to `api`, sends
all other paths to `web`, and adds an SPA fallback inside `web` so `/admin`
works on refresh and direct links.

**No service bindings are needed.** The browser calls `/api` on the same public
domain; that is public routing, not a server-side service-to-service call. The
static web service has no server runtime in which a binding could resolve. If a
server-side web/BFF service is added later, declare the binding on that caller.

### 1. Push the code

This folder is not yet a Git repository. Initialise it, commit, and push it to
GitHub, GitLab, or Bitbucket before importing it into Vercel. Never commit
`.env`, `.env.production.local`, or any other secret file.

### 2. Create the Vercel project

Import the repository with the **repository root** as the Root Directory. The
checked-in `vercel.json` enables Services mode and supplies the framework and
entrypoint for each service.

Add these variables at the **project** level (both services can read them) for
**Production** and, if you want previews, **Preview**:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string |
| `READONLY_DATABASE_URL` | Pooled connection string for the `zahira_readonly` role |
| `JWT_SECRET` | Fresh random string, at least 32 characters |
| `ADMIN_EMAIL` | Admin sign-in email |
| `ADMIN_PASSWORD` | Strong password, at least 12 characters |
| `CORS_ORIGINS` | Exact public origin, e.g. `https://fund.example.org` |
| `THROTTLE_LIMIT` | `100` |
| `TRUST_PROXY` | `true` (Vercel is the trusted proxy) |
| `DB_SYNCHRONIZE` | `false` |
| `USE_MEMORY_DB` | `false` |

`NODE_ENV=production` and `PORT` are supplied by Vercel; do not override them.
Startup validation rejects localhost CORS origins, `synchronize`, and the
in-memory database in production.

Leave `VITE_API_URL` unset: the built site calls `/api` on its own origin. Only
set it if you deliberately want the browser to call a different API host.

Deploy once. The generated domain serves both the site and the API.

### 3. Run migrations and seed against Neon

These commands run locally but use the production values from Vercel:

```powershell
npx vercel@latest login
npx vercel@latest link
npx vercel@latest env pull .env.production.local --environment=production
npm ci
npm run db:migrate
npm run db:seed                 # idempotent; safe to rerun
```

`.env.production.local` is gitignored and read by the migration/seed scripts.
If you rotate the seeded admin password later, delete that admin row in Neon and
rerun `npm run db:seed`; the seed never overwrites an existing admin.

### 4. Verify the launch

1. `GET https://<domain>/api/health` returns `{"status":"ok"}`.
2. `GET https://<domain>/api/campaigns/zahira-college-land-fund/donations/totals`
   returns only `{ "raised": "...", "donors": ... }`. Do not publish donor names,
   messages, slips, or bank refs here.
3. Open `https://<domain>/` in English and Tamil. Check the countdown,
   Rs. 48,000,000 goal, progress, account number `066-1-001-0-0036343`, WhatsApp
   flow, and browser console.
4. Open `/admin`, sign in, and exercise Verify, Reject, Add, Edit, and Delete.
   Confirm the public total changes correctly and delete any test records.
5. Check 320px, 390px, 768px, and desktop widths for horizontal overflow.

### Custom domains and previews

Add a custom domain in the Vercel dashboard and update `CORS_ORIGINS` to that
same origin; no second domain or `VITE_API_URL` change is required. Preview
deployments automatically get a matching `/api` path on their own domain, but
set `CORS_ORIGINS` in the Preview environment to the preview origin if you want
the startup CORS check to match. The site still does not collect money or use
payment webhooks.
