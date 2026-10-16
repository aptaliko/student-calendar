import { z } from 'zod';
import { LESSON_STATUSES, PAYMENT_METHODS, STUDENT_KINDS, type StudentKind } from '@/db/schema';
import { STUDENT_COLOR_NAMES } from './lessons';
import { CURRENCIES } from './money';
import { isValidISODate } from './dates';

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .nullish()
  .transform((v) => (v ? v : null));

export const isoDate = z.string().refine(isValidISODate, 'Μη έγκυρη ημερομηνία');
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Μη έγκυρη ώρα');
const cents = z.number().int().min(0).max(100_000_000);

export const studentSchema = z.object({
  name: z.string().trim().min(1, 'Το όνομα είναι υποχρεωτικό').max(120),
  email: optionalText,
  phone: optionalText,
  color: z.enum(STUDENT_COLOR_NAMES as [string, ...string[]]),
  kind: z.enum(STUDENT_KINDS).default('student'),
  school: optionalText,
  hourlyRateCents: cents,
  notes: optionalText,
});

// `kind` is re-declared without the default: a PATCH that omits it must leave the stored kind alone.
export const studentPatchSchema = studentSchema.partial().extend({
  kind: z.enum(STUDENT_KINDS).optional(),
  school: optionalText.optional(),
  archived: z.boolean().optional(),
});

// The kind is chosen once, at creation. A PATCH may repeat it but not change it.
export function kindChangeError(stored: StudentKind, requested: StudentKind | undefined): string | null {
  return requested === undefined || requested === stored ? null : 'Το είδος δεν μπορεί να αλλάξει';
}

export const lessonSchema = z.object({
  studentId: z.number().int().positive(),
  date: isoDate,
  startTime: hhmm,
  durationMinutes: z.number().int().min(5).max(24 * 60),
  priceCents: cents,
  status: z.enum(LESSON_STATUSES).optional(),
  paid: z.boolean().optional(),
  topic: optionalText,
  notes: optionalText,
});

export const lessonCreateSchema = lessonSchema.extend({
  repeatWeeks: z.number().int().min(1).max(104).default(1),
  /** Weekly until this date (inclusive); takes precedence over repeatWeeks. */
  repeatUntil: isoDate.optional(),
});

export const lessonPatchSchema = lessonSchema.partial();

export const paymentSchema = z.object({
  studentId: z.number().int().positive(),
  amountCents: cents.refine((v) => v > 0, 'Το ποσό πρέπει να είναι μεγαλύτερο από 0'),
  method: z.enum(PAYMENT_METHODS).default('cash'),
  notes: optionalText,
  /** Lessons to pay now; empty = pure prepayment. Ignored for packages. */
  lessonIds: z.array(z.number().int().positive()).max(500).default([]),
  shortfall: z.enum(['discount', 'oldest']).default('discount'),
  /** Package of N lessons; null = money payment/prepayment. */
  lessonCount: z.number().int().min(1).max(200).nullable().default(null),
});

export const accountSchema = z.object({
  name: z.string().trim().max(120).optional(),
  currency: z.enum(CURRENCIES).optional(),
  defaultRateCents: cents.optional(),
  defaultDurationMinutes: z.number().int().min(5).max(24 * 60).optional(),
  timezone: z
    .string()
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'Άγνωστη ζώνη ώρας')
    .optional(),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Μη έγκυρα στοιχεία';
}
