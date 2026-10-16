# CLAUDE.md

@AGENTS.md

## What this app is

Student Calendar is a tool for private teachers: add students (each with an hourly rate and a
colour), schedule lessons (one-off or weekly series), mark attendance, track payments, and see
monthly/yearly reports of hours taught and income. Same stack as glentify: Next.js 16 (App
Router) on Vercel, Neon Postgres via `drizzle-orm/neon-http`, Tailwind v4 + daisyUI 5, zod,
HMAC-signed cookie auth, vitest.

## Model rules worth knowing

- Lessons store a wall-clock `date` ('YYYY-MM-DD') + `startTime` ('HH:MM') — no timezone
  conversion anywhere. The user's `timezone` is only used to work out "today" on the server.
  Date math lives in `src/lib/dates.ts` and works on ISO strings.
- `priceCents` is a snapshot per lesson, so changing a student's rate never rewrites history.
- Status semantics (`src/lib/lessons.ts`): `attended` and `no_show` are charged; `excused`,
  `cancelled` and `scheduled` are not. All report math is in `src/lib/reports.ts` (unit tested).
- Payments (`payments`, `payment_allocations`; `src/db/queries/payments.ts`, rules in
  `src/lib/payments.ts`). A payment has no date; `payment_allocations` record which lessons it
  paid and how much, so money counts towards the month of those lessons. Unallocated money is
  prepayment credit; with `lessonCount` the payment is a package (equal share per lesson).
  Invariant: `applyCredit` runs whenever credit or charged lessons change, spending credit on
  charged unpaid lessons oldest first (oldest payment first); a lesson can be partly paid.
  Un-charging/deleting a lesson or deleting a payment releases allocations back to credit.
  `lessons.paid` = fully settled (by payments, possibly at a discount, or ticked by hand —
  then it has no allocations and its full price counts). Report math: `src/lib/reports.ts`.
- Raw SQL subqueries must name tables explicitly (see `allocatedCentsSql`): in single-table
  selects drizzle renders columns unqualified, so a bare "id" binds to the inner table.
- Every query is scoped by `ownerId`. `src/proxy.ts` verifies the session cookie and sets
  `x-user-id` for route handlers (`getUserId`); server components use `requireUser()`.
- The UI is Greek only (`<html lang="el">`); strings live inline in the components, like in
  glentify. The font is Manrope because it has Greek glyphs (Plus Jakarta Sans does not).
- Date labels and money (`1.234,50 €`) are built by hand, not with `Intl`: Node's and browsers' ICU disagree on
  punctuation, which causes hydration errors in client components.

## Deploying

Push to `main` → CI → `.github/workflows/deploy.yml` migrates the production DB, then
`vercel deploy --prod`. Vercel git auto-deploy for `main` is off (`vercel.json`). A schema
change only needs `npm run db:generate` and a commit; hand-written data backfills go into the
generated SQL file (see `drizzle/0002_payment_allocation.sql`).

## Commands

```bash
npm run dev:up        # Docker Postgres + neon-http proxy, migrate, seed demo@example.com / demo1234
npm run dev           # Next.js dev server
npm run lint && npm run typecheck && npm test
npm run db:generate   # after editing src/db/schema.ts
npm run db:migrate    # apply migrations (uses .env.local)
```
