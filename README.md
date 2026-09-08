# Pico Home

Home-maintenance tracking that tells homeowners **what to do, when, and why**.
~104 expert task templates matched to your home's systems, appliances, and
household; day-one starter tasks; seasonal scheduling; a maintenance score;
shared household lists; push + email reminders.

**Production:** https://picohome.app

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Drizzle ORM on Supabase
Postgres · Supabase Auth (Google OAuth) · Resend (email) · web-push · Sentry ·
Vitest · Vercel (crons + hosting) · Capacitor shells (not yet shipped)

## Development

```bash
npm install
npm run dev          # http://localhost:3000 (uses .env.local)
npm test             # vitest — unit tests for scheduling/matching/schemas
npx tsc --noEmit     # typecheck
npm run lint
```

`.env.example` lists required variables. Local Google sign-in requires
`http://localhost:3000/**` in the Supabase redirect allowlist.

## Database & migrations

The Drizzle journal is historical; SQL under `drizzle/` is applied with the
idempotent runner:

```bash
node scripts/apply-phase0-sql.mjs
```

Row access is API-only: PostgREST grants are revoked; storage policies use a
`SECURITY DEFINER` membership helper.

## Operations

- **Crons** (`vercel.json`): health-score 06:00 UTC · push 13:00 UTC · digest
  10:00 UTC daily (per-user Monday gate). Cron routes answer **GET** with
  `CRON_SECRET` bearer auth; sends are once-per-user-per-day via
  `notification_log`.
- **Deploys**: `git push` should auto-deploy; if the Git integration stalls,
  `npx vercel deploy --prod`.
- **Errors**: Sentry (project still under its legacy name) via
  `src/instrumentation*.ts`.

## Docs

- Product/architecture/schema/roadmap: Notion → 🏠 Pico Home Documentation Hub
- Pre-launch audit & verified fixes: internal artifact (see Notion hub)
- Design specs and plans: `docs/superpowers/`
