// Seeds a demo teacher with students and ~5 months of lessons (idempotent: skips if the
// demo user already exists). Local development only — never run against production.
import { db } from '../src/db/client';
import { lessons, students, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../src/lib/passwordHash';
import { addDays, startOfWeek, todayIn } from '../src/lib/dates';
import { priceFor } from '../src/lib/money';
import type { LessonStatus } from '../src/db/schema';

const EMAIL = 'demo@example.com';

async function main() {
  const [existing] = await db.select().from(users).where(eq(users.email, EMAIL));
  if (existing) {
    console.log(`Demo user ${EMAIL} already exists — skipping seed.`);
    return;
  }

  const [user] = await db
    .insert(users)
    .values({ email: EMAIL, passwordHash: hashPassword('demo1234'), name: 'Μαρία Παπαδοπούλου', timezone: 'Europe/Athens' })
    .returning();

  const roster = [
    { name: 'Νίκος Γεωργίου', color: 'violet', hourlyRateCents: 2500, weekday: 0, time: '16:00', minutes: 60, email: 'nikos@example.com' },
    { name: 'Ελένη Δημητρίου', color: 'sky', hourlyRateCents: 3000, weekday: 1, time: '17:30', minutes: 90, phone: '+30 690 000 0000' },
    { name: 'Σοφία Λαμπράκη', color: 'emerald', hourlyRateCents: 2000, weekday: 2, time: '15:00', minutes: 45 },
    { name: 'Αλέξης Μαρτίνος', color: 'amber', hourlyRateCents: 2800, weekday: 3, time: '18:00', minutes: 60 },
    { name: 'Κατερίνα Ιωάννου', color: 'rose', hourlyRateCents: 2500, weekday: 4, time: '16:30', minutes: 60 },
  ];

  const created = await db
    .insert(students)
    .values(roster.map(({ name, color, hourlyRateCents, email, phone }) => ({ ownerId: user.id, name, color, hourlyRateCents, email, phone })))
    .returning();

  const today = todayIn('Europe/Athens');
  const firstWeek = addDays(startOfWeek(today), -7 * 20);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const rows = [];
  for (let w = 0; w < 24; w++) {
    for (const [i, r] of roster.entries()) {
      const date = addDays(firstWeek, w * 7 + r.weekday);
      const past = date < today;
      let status: LessonStatus = 'scheduled';
      if (past) {
        const x = rand();
        status = x < 0.84 ? 'attended' : x < 0.9 ? 'no_show' : x < 0.97 ? 'excused' : 'cancelled';
      }
      const charged = status === 'attended' || status === 'no_show';
      rows.push({
        ownerId: user.id,
        studentId: created[i].id,
        date,
        startTime: r.time,
        durationMinutes: r.minutes,
        priceCents: priceFor(r.hourlyRateCents, r.minutes),
        status,
        paid: charged && date < addDays(today, -14 - i * 3),
        seriesId: `demo-${i}`,
      });
    }
  }
  // A couple of lessons today that still need marking.
  rows.push({ ownerId: user.id, studentId: created[2].id, date: today, startTime: '09:00', durationMinutes: 60, priceCents: 2000, status: 'scheduled' as const, paid: false, seriesId: null });

  await db.insert(lessons).values(rows);
  console.log(`Seeded ${EMAIL} / demo1234 with ${created.length} students and ${rows.length} lessons.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
