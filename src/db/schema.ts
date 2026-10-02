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
    paid: boolean('paid').notNull().default(false),
    topic: text('topic'),
    notes: text('notes'),
    // Shared by lessons created together as a weekly series.
    seriesId: text('series_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('lessons_owner_date_idx').on(t.ownerId, t.date), index('lessons_student_idx').on(t.studentId)],
);

export type User = typeof users.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
