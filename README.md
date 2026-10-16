# Student Calendar

Schedule lessons, track attendance and see what you earn — built for private teachers.
The interface is in Greek (Ημερολόγιο Μαθητών).

- **Today** dashboard: greeting, this month's hours / income / outstanding / attendance, a
  *Needs marking* list for past lessons, one-tap **Present / No-show / Excused** buttons, and
  *Who owes you* with one-click **Settle**.
- **Calendar**: month view (dots + day agenda on phones) and week time-grid (agenda on phones),
  student filter chips, click any slot to schedule. Weekly recurring lessons in one step;
  delete one lesson or *this & following*.
- **Students**: colour-coded cards with hours this month, attendance rate and balance; a
  profile page with stats, upcoming lessons and month-by-month history; archive or delete.
- **Reports**: month / year, hours taught, income earned vs. collected, effective hourly rate,
  attendance breakdown, a 12-month income/hours chart, per-student table and **CSV export**.
- **Payments & prepayments**: record a lump-sum payment by ticking the unpaid lessons it covers
  (a smaller amount can be a discount or a partial payment). Extra money becomes prepayment
  that automatically pays the next lessons as they are marked. **Packages** ("10 lessons for
  230 €") work the same way per lesson. Old unpaid lessons are always paid first.
- **Settings**: name, timezone, currency, default rate and lesson length.
- Light and dark themes (follows the OS), installable-feeling mobile layout with a bottom tab bar.

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 + daisyUI 5 · Drizzle ORM · Neon Postgres · zod · Vercel

## Local development

Requires Docker.

```bash
npm install
npm run dev:up      # starts Postgres + neon-http proxy, migrates, seeds a demo account
npm run dev         # http://localhost:3000 — sign in as demo@example.com / demo1234
```

`npm run dev:up -- --reset` wipes the local database. `npm run dev:down` stops it.

## Deploying to Vercel

Production deploys run from GitHub Actions, like glentify: on every push to `main`,
**CI** (lint, typecheck, tests) runs, then **Deploy** (`.github/workflows/deploy.yml`) applies
any new database migrations to production and only then deploys to Vercel. New code therefore
never goes live against an old schema, and nobody runs migrations by hand. Vercel's own
auto-deploy for `main` is switched off in `vercel.json`; preview deploys of other branches
still come from Vercel's git integration.

One-time setup:

1. Create a Neon database and import this repo in Vercel. In Vercel → Settings → Environment
   Variables set `DATABASE_URL` (the Neon connection string) and `AUTH_SECRET` (a long random
   string, e.g. `openssl rand -hex 32`).
2. Create a Vercel access token at vercel.com/account/tokens. Find the org and project IDs in
   Vercel → Project → Settings → General (*Project ID*) and Team/Account Settings (*Team ID*),
   or in `.vercel/project.json` after running `npx vercel link`.
3. In GitHub → Settings → Secrets and variables → Actions, add:
   - `PROD_DATABASE_URL` — the same Neon connection string
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
4. Make sure `main` is the repository's default branch (the Deploy workflow is triggered from it).
5. Push to `main` (or re-run the latest Deploy workflow in the Actions tab).
