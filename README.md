# Student Calendar

Schedule lessons, track attendance and see what you earn — built for private teachers.

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

1. Create a Neon database (Vercel → Storage → Neon works too) and copy its connection string.
2. Import this repo in Vercel and set the env vars from `.env.example`:
   `DATABASE_URL` and `AUTH_SECRET` (any long random string, e.g. `openssl rand -hex 32`).
3. Apply the schema once: `DATABASE_URL=... npx tsx scripts/migrate.ts`
   (rerun after any new migration in `drizzle/`).
4. Deploy. Create your account at `/register`.
