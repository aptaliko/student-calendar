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
- Payments (`payments` table, `src/db/queries/payments.ts`) cover one or more lessons via
  `lessons.paymentId`; recording one marks its lessons `paid`, deleting it un-marks them. The
  amount may differ from the lessons' sum (discount). "Owed" is lesson-based; "collected" in
  reports is cash-based: payments dated in the period + lessons ticked paid by hand
  (`collectedCents` in `src/lib/payments.ts`). "Settle" creates a payment for the full balance.
- Every query is scoped by `ownerId`. `src/proxy.ts` verifies the session cookie and sets
  `x-user-id` for route handlers (`getUserId`); server components use `requireUser()`.
- The UI is Greek only (`<html lang="el">`); strings live inline in the components, like in
  glentify. The font is Manrope because it has Greek glyphs (Plus Jakarta Sans does not).
- Date labels and money (`1.234,50 €`) are built by hand, not with `Intl`: Node's and browsers' ICU disagree on
  punctuation, which causes hydration errors in client components.

## Commands

```bash
npm run dev:up        # Docker Postgres + neon-http proxy, migrate, seed demo@example.com / demo1234
npm run dev           # Next.js dev server
npm run lint && npm run typecheck && npm test
npm run db:generate   # after editing src/db/schema.ts
npm run db:migrate    # apply migrations (uses .env.local)
```
