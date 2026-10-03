import { pgTable, serial, text, integer, timestamp, boolean, date, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull().default(''),
  // Display + defaults for new students/lessons. Money is always stored in integer cents.
  currency: text('currency').notNull().default('EUR'),
  defaultRateCents: integer('default_rate_cents').notNull().default(2000),
  defaultDurationMinutes: integer('default_duration_minutes').notNull().default(60),
  // IANA zone used to work out "today" on the server (lessons themselves are wall-clock).
  timezone: text('timezone').notNull().default('UTC'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const students = pgTable(
  'students',
  {
    id: serial('id').primaryKey(),
    ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    color: text('color').notNull().default('violet'),
    hourlyRateCents: integer('hourly_rate_cents').notNull(),
    notes: text('notes'),
    archived: boolean('archived').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('students_owner_idx').on(t.ownerId)],
);

export const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Money received from a student. It has no date of its own: it counts towards the month of the
// lessons it pays for, through `payment_allocations`. Whatever is not allocated yet is credit
// (prepayment) that is spent automatically, oldest lesson first, as lessons become charged.
// With `lessonCount` it is a package ("10 lessons for 230 €"): each lesson uses an equal share.
export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    method: text('method').$type<PaymentMethod>().notNull().default('cash'),
    lessonCount: integer('lesson_count'),
    notes: text('notes'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('payments_owner_idx').on(t.ownerId), index('payments_student_idx').on(t.studentId)],
);

// Lesson status:
//   scheduled — not yet marked
//   attended  — student came (charged)
//   no_show   — absent without notice (charged)
//   excused   — absent with notice (not charged)
//   cancelled — cancelled by teacher (not charged)
export const LESSON_STATUSES = ['scheduled', 'attended', 'no_show', 'excused', 'cancelled'] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

export const lessons = pgTable(
  'lessons',
  {
    id: serial('id').primaryKey(),
    ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    studentId: integer('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
    // Wall-clock date + time as the teacher sees them; no timezone conversion anywhere.
    date: date('date', { mode: 'string' }).notNull(),
    startTime: text('start_time').notNull(), // 'HH:MM'
    durationMinutes: integer('duration_minutes').notNull(),
    // Price snapshot for this lesson, so later rate changes don't rewrite history.
    priceCents: integer('price_cents').notNull(),
    status: text('status').$type<LessonStatus>().notNull().default('scheduled'),
    // Fully settled. Set by payments (possibly at a discount) or ticked by hand; a lesson ticked
    // by hand with no allocations counts its full price as collected.
    paid: boolean('paid').notNull().default(false),
    topic: text('topic'),
    notes: text('notes'),
    // Shared by lessons created together as a weekly series.
    seriesId: text('series_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('lessons_owner_date_idx').on(t.ownerId, t.date), index('lessons_student_idx').on(t.studentId)],
);

// Which payment paid how much of which lesson. A lesson can be paid by several payments
// (e.g. the last 10 € of a prepayment plus 15 € from the next one).
export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: serial('id').primaryKey(),
    paymentId: integer('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
    lessonId: integer('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
  },
  (t) => [index('payment_allocations_payment_idx').on(t.paymentId), index('payment_allocations_lesson_idx').on(t.lessonId)],
);

export type User = typeof users.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Payment = typeof payments.$inferSelect;
