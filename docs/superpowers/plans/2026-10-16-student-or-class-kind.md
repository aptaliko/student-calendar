# Students and classes (Τμήματα) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a teacher create a billable row of kind `class` ("Τμήμα") next to `student` rows, so a class can be scheduled, marked, paid and reported exactly like a student, without any new lesson or payment logic.

**Architecture:** A `kind` column and an optional `school` column on the existing `students` table. Every other module keeps keying on the row id. The kind is chosen at creation and is immutable afterwards. UI changes are a kind control in the add/edit dialog, a kind filter and tag in the list, and a tag in the lesson picker.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM on Neon Postgres, zod, React client components with daisyUI 5, vitest.

**Spec:** `docs/superpowers/specs/2026-10-16-student-or-class-kind-design.md`

## Global Constraints

- Price logic is unchanged: `priceFor(hourlyRateCents, duration)` and the "Τιμή" field in `LessonDialog` are not touched.
- The UI is Greek only; strings stay inline in the components.
- Every query stays scoped by `ownerId`.
- Money and dates are not formatted with `Intl`.
- Commit messages carry no AI attribution, per the user's CLAUDE.md.

## Review Focus

1. A class with a whitespace-only `school` is stored as `null`, not `""`. (Task 2)
2. A PATCH whose `kind` differs from the stored kind is rejected with 400, and a PATCH without `kind` leaves it unchanged. (Task 2, Task 3)
3. An unknown kind on create (e.g. `"lesson"`) is a 400, not a 500. (Task 2)
4. Existing rows (all `student`) appear unchanged in the list and the lesson picker, with no tag. (Task 5, Task 6)
5. An archived class stays under the "Αρχειοθετημένοι" tab with its tag, and stays selectable in the lesson dialog only when editing one of its lessons. (Task 5, Task 6)

---

### Task 1: Schema column and migration

**Files:**
- Modify: `src/db/schema.ts` (the `students` table, around line 17)
- Create (generated): `drizzle/0003_*.sql` and the matching `drizzle/meta` files

**Interfaces:**
- Produces: `export const STUDENT_KINDS = ['student', 'class'] as const;` and `export type StudentKind`, both in `src/db/schema.ts`. `Student` now has `kind: StudentKind` and `school: string | null`.

- [ ] **Step 1: Add the columns and the type**

In `students`, after `color`:

```ts
kind: text('kind').$type<StudentKind>().notNull().default('student'),
school: text('school'),
```

Define `STUDENT_KINDS` and `StudentKind` above the `students` table, following the `LESSON_STATUSES` pattern.

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`
Expected: a new `drizzle/0003_*.sql` containing `ALTER TABLE "students" ADD COLUMN "kind" text DEFAULT 'student' NOT NULL;` and `ADD COLUMN "school" text;`, and nothing else. If the SQL contains other changes, stop and report them.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. Existing code that builds `Student` objects (none expected outside tests) must still compile.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle
git commit -m "Add student kind and school columns"
```

---

### Task 2: Validation rules

**Files:**
- Modify: `src/lib/validation.ts` (`studentSchema` line 22, `studentPatchSchema` line 31)
- Test: `src/lib/validation.test.ts` (create)

**Interfaces:**
- Consumes: `STUDENT_KINDS`, `StudentKind` from `@/db/schema`.
- Produces: `studentSchema` (adds `kind`, `school`), `studentPatchSchema` (adds optional `kind`, `school`), and `kindChangeError(stored: StudentKind, requested: StudentKind | undefined): string | null`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { kindChangeError, studentPatchSchema, studentSchema } from './validation';

const base = { name: 'Γιάννης', color: 'violet', hourlyRateCents: 2000 };

describe('studentSchema kind and school', () => {
  it('defaults kind to student when omitted', () => {
    expect(studentSchema.parse(base).kind).toBe('student');
  });

  it('accepts a class with a school', () => {
    const parsed = studentSchema.parse({ ...base, kind: 'class', school: ' 2ο Δημοτικό ' });
    expect(parsed).toMatchObject({ kind: 'class', school: '2ο Δημοτικό' });
  });

  it('stores a whitespace-only school as null', () => {
    expect(studentSchema.parse({ ...base, kind: 'class', school: '   ' }).school).toBeNull();
  });

  it('rejects an unknown kind', () => {
    expect(studentSchema.safeParse({ ...base, kind: 'lesson' }).success).toBe(false);
  });
});

describe('studentPatchSchema kind', () => {
  it('leaves kind undefined when it is not sent, so no default is applied', () => {
    expect(studentPatchSchema.parse({ name: 'x' }).kind).toBeUndefined();
  });
});

describe('kindChangeError', () => {
  it('allows a PATCH that omits kind', () => {
    expect(kindChangeError('class', undefined)).toBeNull();
  });

  it('allows a PATCH that repeats the stored kind', () => {
    expect(kindChangeError('class', 'class')).toBeNull();
  });

  it('rejects a PATCH that changes the kind', () => {
    expect(kindChangeError('student', 'class')).toBe('Το είδος δεν μπορεί να αλλάξει');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/validation.test.ts`
Expected: FAIL, because `kindChangeError` is not exported and `kind` / `school` are not in the schema.

- [ ] **Step 3: Implement**

In `src/lib/validation.ts`:
- Add `kind: z.enum(STUDENT_KINDS).default('student')` and `school: optionalText` to `studentSchema`. `optionalText` already maps empty and whitespace to `null`, so reuse it.
- Add `kind: z.enum(STUDENT_KINDS).optional()` and `school: optionalText.optional()` to `studentPatchSchema`. Keep the existing `archived` field.
- Add `kindChangeError`:

```ts
export function kindChangeError(stored: StudentKind, requested: StudentKind | undefined): string | null {
  return requested === undefined || requested === stored ? null : 'Το είδος δεν μπορεί να αλλάξει';
}
```

Check the `.optional()` wrapper: `optionalText` ends in a `transform`, so `.optional()` on it must still return `undefined` for a missing key. The `kind` test above checks that the default is not applied in the patch.

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/lib/validation.test.ts`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/validation.test.ts
git commit -m "Validate student kind and school"
```

---

### Task 3: PATCH rejects a kind change

**Files:**
- Modify: `src/app/api/students/[id]/route.ts` (PATCH handler, lines 9-18)
- Modify: `src/db/queries/students.ts` (`StudentInput`, line 5)

**Interfaces:**
- Consumes: `kindChangeError` from `@/lib/validation`, `getStudent` from `@/db/queries/students`.
- Produces: `StudentInput` becomes `Pick<Student, 'name' | 'email' | 'phone' | 'color' | 'hourlyRateCents' | 'notes' | 'kind' | 'school'>`.

- [ ] **Step 1: Update `StudentInput`**

Add `'kind' | 'school'` to the `Pick`. `createStudent` already spreads `data`, so no other change there.

- [ ] **Step 2: Check the kind in PATCH**

In the PATCH handler, after parsing, load the stored row and compare. Return 404 when it is missing, as the existing code does:

```ts
const current = await getStudent(getUserId(request), id);
if (!current) return NextResponse.json({ error: 'Δεν βρέθηκε' }, { status: 404 });
const kindError = kindChangeError(current.kind, parsed.data.kind);
if (kindError) return NextResponse.json({ error: kindError }, { status: 400 });
```

Then call `updateStudent` as before. Note that `updateStudent` already receives `kind` in `parsed.data` if it was sent and equal to the stored value. That write is harmless.

- [ ] **Step 3: Verify by hand**

Run `npm run dev` (with `npm run dev:up` first), log in as the seeded `demo@example.com`, then:

```bash
curl -s -X PATCH localhost:3000/api/students/1 -H 'content-type: application/json' -H "cookie: $SESSION" -d '{"kind":"class"}'
```

Expected: `{"error":"Το είδος δεν μπορεί να αλλάξει"}` with status 400 when student 1 is a `student`. A PATCH with only `{"name":"x"}` returns 200.

The session cookie name and value come from the browser after login; use the devtools copy. If `dev:up` is not available in this environment, report that and rely on the unit tests from Task 2.

- [ ] **Step 4: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS.

```bash
git add src/app/api/students src/db/queries/students.ts
git commit -m "Reject kind changes on student update"
```

---

### Task 4: StudentDialog kind control

**Files:**
- Modify: `src/components/StudentDialog.tsx`
- Modify: `src/components/Actions.tsx` (`NewStudentButton`, line 31: default label)

**Interfaces:**
- Consumes: `StudentKind` from `@/db/schema`.
- Produces: the dialog accepts an optional `kind` prop when creating, defaulting to `'student'`. Title, labels and button copy switch with the kind.

- [ ] **Step 1: Add the kind state and the control**

- `const [kind, setKind] = useState<StudentKind>(student?.kind ?? 'student');`
- `const [school, setSchool] = useState(student?.school ?? '');`
- A segmented control at the top of the form, before the name field. Use `tabs tabs-box` with two `tab` buttons, "Μαθητής" and "Τμήμα". When `student` is set, render it disabled with the current value selected. Do not offer a switch.

- [ ] **Step 2: Switch the copy by kind**

Use one lookup so the strings are not scattered through the JSX:

| Place | student | class |
|---|---|---|
| Modal title (new) | "Νέος μαθητής" | "Νέο τμήμα" |
| Modal title (edit) | "Επεξεργασία μαθητή" | "Επεξεργασία τμήματος" |
| Name label | "Ονοματεπώνυμο" | "Όνομα τμήματος" |
| Submit (new) | "Προσθήκη μαθητή" | "Προσθήκη τμήματος" |
| Toast (edit) | "Ο μαθητής ενημερώθηκε" | "Το τμήμα ενημερώθηκε" |

- [ ] **Step 3: Show the school field for a class**

When `kind === 'class'`, render a "Σχολείο" `floating-label` input bound to `school`, placed right after the name. Hide the "Email" and "Τηλέφωνο" grid for classes, since they belong to people.

- [ ] **Step 4: Send the fields**

The submit body becomes `{ name, email, phone, color, hourlyRateCents, notes, school, kind }`. On edit, drop `kind` from the body, so a PATCH never sends it. Build that as a separate object, not with `delete`.

- [ ] **Step 5: Default label on the button**

In `src/components/Actions.tsx` line 31, change the default `label` from `'Προσθήκη μαθητή'` to `'Προσθήκη'`. Each caller of `NewStudentButton` can still pass its own label.

- [ ] **Step 6: Verify by hand**

In `npm run dev`: open "Προσθήκη", switch to "Τμήμα", confirm the title, the "Όνομα τμήματος" label and the "Σχολείο" field appear, create one, and confirm the row appears in the database with `kind = 'class'`. Open it for edit, confirm the control is locked.

- [ ] **Step 7: Typecheck, lint, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/components/StudentDialog.tsx src/components/Actions.tsx
git commit -m "Add student or class choice to the student dialog"
```

---

### Task 5: Students list kind filter and tags

**Files:**
- Modify: `src/components/StudentsList.tsx`
- Modify: `src/app/(app)/students/page.tsx` (`StudentsPage` subtitle and the `rows` mapping)

**Interfaces:**
- Consumes: `Row` as it already exists in `StudentsList`; `student.kind` on each row.

- [ ] **Step 1: Kind filter state**

Add `const [kindFilter, setKindFilter] = useState<'all' | StudentKind>('all');` in `StudentsList`. Filter with `kindFilter === 'all' || r.student.kind === kindFilter`, alongside the existing archived and search filters.

- [ ] **Step 2: Show the filter only when it matters**

Render a second `tabs tabs-box tabs-sm` with "Όλα", "Μαθητές", "Τμήματα" only when `rows.some((r) => r.student.kind === 'class')`. A teacher with students only sees the list they had before.

- [ ] **Step 3: Tag classes**

Next to the name in each card, when `s.kind === 'class'`, add `<span className="badge badge-outline badge-sm">Τμήμα</span>`. For a class with a `school`, show it on the card's second line, after the hourly rate.

- [ ] **Step 4: Copy**

- In `StudentsPage` (`students/page.tsx`), change the subtitle from `ενεργοί μαθητές` to `ενεργοί μαθητές και τμήματα`, and the `PageHeader` title from "Μαθητές" to "Μαθητές και τμήματα".
- In `StudentsList`, the empty state title becomes "Δεν υπάρχουν μαθητές ή τμήματα ακόμη", and its text becomes "Προσθέστε έναν μαθητή ή ένα τμήμα με την ωριαία χρέωσή του για να ξεκινήσετε τον προγραμματισμό."

- [ ] **Step 5: Verify by hand (review focus 4 and 5)**

In `npm run dev`:
- With only students, no kind filter appears and the list looks as before.
- Create a class, confirm the kind filter appears, "Τμήματα" shows only the class, and the tag shows.
- Archive the class, confirm it moves to "Αρχειοθετημένοι" with its tag.

- [ ] **Step 6: Typecheck, lint, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/components/StudentsList.tsx "src/app/(app)/students/page.tsx"
git commit -m "Filter students and classes in the list"
```

---

### Task 6: Lesson picker tag

**Files:**
- Modify: `src/components/LessonDialog.tsx` (chip button, around lines 166-179)

- [ ] **Step 1: Add the tag to the chip**

Inside the chip button, after `{s.name}`, add `{s.kind === 'class' && <span className="badge badge-outline badge-xs">Τμήμα</span>}`. Do not change the list, the active filter, or the price code. The "Τιμή" field is out of scope.

- [ ] **Step 2: Verify by hand (review focus 5)**

Open "Νέο μάθημα": the class chip has the tag and sits in the same row as the students. Open an existing lesson of an archived class: the chip still shows, as before.

- [ ] **Step 3: Typecheck, lint, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/components/LessonDialog.tsx
git commit -m "Tag classes in the lesson picker"
```

---

### Task 7: Full verification

- [ ] **Step 1: Run the full suite**

Run: `npm run lint && npm run typecheck && npm test`
Expected: PASS. The new `validation.test.ts` and the existing `reports`, `payments`, `dates`, `money` and `auth` tests all pass. Report the test counts.

- [ ] **Step 2: Check the end-to-end flow by hand**

With `npm run dev`, as the demo user: create class "Α' Γυμνασίου" with school "2ο Δημοτικό" and a rate. Schedule two lessons with it, mark one attended and one no-show, record a payment, and check the reports page totals include the class. Then confirm an existing student's history is unchanged.

- [ ] **Step 3: Report**

State the test output, the manual results, and anything not checked. Do not push. The branch stays local until the user says so.
