# Students and classes ("Τμήματα") as billable rows

Date: 2026-10-16
Branch: `feat/student-or-class-kind`

## Problem

A teacher teaches whole classes ("Τμήμα"), for example Class A of school X, twice a week, paid
per lesson by the school. Individual students are not tracked in that case. Today every lesson
belongs to a `students` row, so a class has to be entered as a fake student.

## Decisions

- The school is the payer. The teacher splits the money across classes outside the app, so no
  payer entity is needed.
- Pricing does not change. A class is billed by the hour like a student: `priceCents` is the
  snapshot of `hourlyRateCents × duration`, and the "Τιμή" field stays as it is.
- Attendance stays per lesson (one status per lesson). A class has no per-person data.
- A row's kind is chosen once at creation and cannot be changed afterwards. This avoids
  reinterpreting existing lessons and payments.
- Students and classes live in the same table and share all lesson, payment, settle and report
  code. The model only gains a `kind`.

## Data model

`students` gets two columns:

- `kind text not null default 'student'`, restricted to `'student' | 'class'`
  (`STUDENT_KINDS` in `src/db/schema.ts`, same pattern as `LESSON_STATUSES`).
- `school text null`, meaningful for classes only.

Existing rows become `student` through the default, so no backfill is needed. Generated with
`npm run db:generate`; the migration only adds columns.

## Validation

`src/lib/validation.ts`:

- `kind` is an enum, default `student` on create.
- `school` is optional, trimmed, and stored as null when empty.
- On update, `kind` is not accepted. A provided `kind` that differs from the stored one is
  rejected with a 400.

## UI

- **StudentDialog** (the add/edit dialog): a segmented control at the top, "Μαθητής | Τμήμα".
  It is locked when editing. A class shows a "Σχολείο" field in place of notes. Name, colour,
  hourly rate and archive work the same way for both.
- **Students page** (`src/app/(app)/students`): one list with a filter, "Όλα | Μαθητές |
  Τμήματα". Each row shows a small "Τμήμα" tag for classes. Counts and filters follow the
  selected tab.
- **Lesson dialog**: the picker is the existing row of chips and keeps listing both kinds
  together, with a "Τμήμα" tag after the name of a class. The "Τιμή" field is not touched.
- **Calendar**: no change. Rows already have a colour, so mixed kinds are distinguishable.
- **Reports and payments**: no change. Payments and settle still work per row.

## API

`/api/students` and `/api/students/[id]` accept and return `kind` and `school`. Everything
else keeps its current behaviour.

## Out of scope

- Per-person attendance inside a class.
- Multi-weekday weekly series ("twice a week" on two days). Two series can be created by hand
  for now; this is a separate feature.
- A payer or school entity above classes.
- Renaming the `students` table.

## Testing

- Unit tests for the validation: default kind, the enum, school trimming and emptying, and
  rejecting a kind change on update.
- Existing tests (`reports`, `payments`, `lessons`) must still pass; no changes expected.
- Manual check in `npm run dev`: create a class, schedule a lesson with it, mark it, record a
  payment, filter the list by kind.
