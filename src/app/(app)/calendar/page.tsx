import { listLessons } from '@/db/queries/lessons';
import CalendarView from '@/components/CalendarView';
import { isValidISODate, monthGrid, todayIn, weekDates } from '@/lib/dates';
import { requireUser } from '@/lib/session';

export const metadata = { title: 'Ημερολόγιο' };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; student?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayIn(user.timezone);
  const view = sp.view === 'week' ? 'week' : 'month';
  const date = sp.date && isValidISODate(sp.date) ? sp.date : today;
  const days = view === 'month' ? monthGrid(date) : weekDates(date);
  const lessons = await listLessons(user.id, { from: days[0], to: days[days.length - 1] });

  return <CalendarView view={view} date={date} today={today} days={days} lessons={lessons} />;
}
