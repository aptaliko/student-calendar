import { z } from 'zod';
import { LESSON_STATUSES, PAYMENT_METHODS } from '@/db/schema';
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
  hourlyRateCents: cents,
  notes: optionalText,
});

export const studentPatchSchema = studentSchema.partial().extend({ archived: z.boolean().optional() });

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
  repeatWeeks: z.number().int().min(1).max(52).default(1),
});

export const lessonPatchSchema = lessonSchema.partial();

export const paymentSchema = z.object({
  studentId: z.number().int().positive(),
  date: isoDate,
  amountCents: cents.refine((v) => v > 0, 'Το ποσό πρέπει να είναι μεγαλύτερο από 0'),
  method: z.enum(PAYMENT_METHODS).default('cash'),
  notes: optionalText,
  lessonIds: z.array(z.number().int().positive()).min(1, 'Επιλέξτε τουλάχιστον ένα μάθημα').max(500),
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
