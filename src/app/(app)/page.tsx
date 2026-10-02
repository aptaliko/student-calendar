import Link from 'next/link';
import { AlarmClock, CalendarHeart, CalendarPlus, Clock3, Coins, Percent, Sparkles, Users, Wallet } from 'lucide-react';
import { listLessons } from '@/db/queries/lessons';
import { listStudents } from '@/db/queries/students';
import Avatar from '@/components/Avatar';
import Card, { EmptyState } from '@/components/Card';
import LessonRow from '@/components/LessonRow';
import StatTile from '@/components/StatTile';
import { NewLessonButton, NewStudentButton, SettleButton } from '@/components/Actions';
import { addDays, endOfMonth, longDay, monthLabel, nowTimeIn, startOfMonth, timeToMinutes, todayIn } from '@/lib/dates';
import { formatHours, formatMoney } from '@/lib/money';
import { totals, totalsByStudent } from '@/lib/reports';
import { requireUser } from '@/lib/session';

export const metadata = { title: 'Today' };

function greeting(time: string) {
  const h = Number(time.slice(0, 2));
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function TodayPage() {
  const user = await requireUser();
  const today = todayIn(user.timezone);
  const now = nowTimeIn(user.timezone);
  const monthStart = startOfMonth(today);

  const [students, monthLessons, unmarked, upcoming, allCharged] = await Promise.all([
    listStudents(user.id),
    listLessons(user.id, { from: monthStart, to: endOfMonth(today) }),
    listLessons(user.id, { to: today, status: ['scheduled'] }),
    listLessons(user.id, { from: addDays(today, 1), to: addDays(today, 7) }),
    listLessons(user.id, { status: ['attended', 'no_show'] }),
  ]);

  const month = totals(monthLessons);
  const todays = monthLessons.filter((l) => l.date === today);
  // Lessons in the past (or that have already ended today) that still need an attendance mark.
  const needsMarking = unmarked.filter(
    (l) => l.date < today || timeToMinutes(l.startTime) + l.durationMinutes <= timeToMinutes(now),
  );
  const balances = [...totalsByStudent(allCharged).entries()]
    .filter(([, t]) => t.outstandingCents > 0)
    .sort((a, b) => b[1].outstandingCents - a[1].outstandingCents);
  const totalOutstanding = balances.reduce((s, [, t]) => s + t.outstandingCents, 0);
  const byId = new Map(students.map((s) => [s.id, s]));
  const firstName = user.name.split(' ')[0];

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-base-content/50">{longDay(today)}</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {greeting(now)}
            {firstName && (
              <>
                , <span className="brand-text">{firstName}</span>
              </>
            )}
          </h1>
          <p className="mt-1 text-base-content/60">
            {todays.length === 0
              ? 'No lessons today — enjoy the free time ✨'
              : `You have ${todays.length} lesson${todays.length === 1 ? '' : 's'} today.`}
          </p>
        </div>
        <NewLessonButton className="btn btn-primary hidden lg:inline-flex" />
      </div>

      {students.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sparkles className="size-7" />}
            title="Let’s get you set up"
            text="Add your first student with their hourly rate, then schedule a lesson. Recurring weekly lessons take one click."
          >
            <NewStudentButton className="btn btn-primary brand-gradient border-0" label="Add your first student" />
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile icon={Clock3} label="Hours this month" value={formatHours(month.attendedMinutes)} hint={`${month.attended} lessons attended`} />
            <StatTile icon={Coins} tone="secondary" label="Earned" value={formatMoney(month.earnedCents, user.currency, { compact: true })} hint={monthLabel(today)} />
            <StatTile
              icon={Wallet}
              tone="warning"
              label="Outstanding"
              value={formatMoney(totalOutstanding, user.currency, { compact: true })}
              hint={`${balances.length} student${balances.length === 1 ? '' : 's'} owe`}
            />
            <StatTile
              icon={Percent}
              tone="success"
              label="Attendance"
              value={month.attendanceRate === null ? '—' : `${Math.round(month.attendanceRate * 100)}%`}
              hint={`${month.noShow} no-show · ${month.excused} excused`}
            />
          </div>

          {needsMarking.length > 0 && (
            <Card
              className="ring-2 ring-warning/40"
              title={
                <span className="flex items-center gap-2">
                  <AlarmClock className="size-5 text-warning" /> Needs marking
                  <span className="badge badge-warning badge-sm">{needsMarking.length}</span>
                </span>
              }
            >
              <p className="px-3 pb-1 text-sm text-base-content/55">Did these students show up? One tap to record it.</p>
              <div className="divide-y divide-base-200">
                {needsMarking.slice(0, 8).map((l) => (
                  <LessonRow key={l.id} lesson={l} showDate />
                ))}
              </div>
              {needsMarking.length > 8 && (
                <Link href="/calendar" className="btn btn-ghost btn-sm m-2">
                  + {needsMarking.length - 8} more in the calendar
                </Link>
              )}
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="min-w-0 space-y-6 lg:col-span-3">
              <Card title="Today" action={<NewLessonButton defaults={{ date: today }} className="btn btn-ghost btn-sm" label="Add" />}>
                {todays.length === 0 ? (
                  <EmptyState icon={<CalendarHeart className="size-7" />} title="Nothing scheduled today" />
                ) : (
                  <div className="divide-y divide-base-200">
                    {todays.map((l) => (
                      <LessonRow key={l.id} lesson={l} />
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Next 7 days" action={<Link href="/calendar?view=week" className="btn btn-ghost btn-sm">Week view</Link>}>
                {upcoming.length === 0 ? (
                  <EmptyState icon={<CalendarPlus className="size-7" />} title="Your week is open" text="Schedule recurring lessons to fill it up.">
                    <NewLessonButton className="btn btn-primary btn-sm" />
                  </EmptyState>
                ) : (
                  <div className="divide-y divide-base-200">
                    {upcoming.slice(0, 10).map((l) => (
                      <LessonRow key={l.id} lesson={l} showDate />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="min-w-0 space-y-6 lg:col-span-2">
              <Card title="Who owes you" action={<span className="text-sm font-semibold tabular">{formatMoney(totalOutstanding, user.currency)}</span>}>
                {balances.length === 0 ? (
                  <EmptyState icon={<Wallet className="size-7" />} title="All settled up" text="Every charged lesson has been paid. 🎉" />
                ) : (
                  <ul className="divide-y divide-base-200">
                    {balances.slice(0, 6).map(([id, t]) => {
                      const s = byId.get(id);
                      if (!s) return null;
                      return (
                        <li key={id} className="flex items-center gap-3 px-3 py-2.5">
                          <Avatar name={s.name} color={s.color} size="sm" />
                          <Link href={`/students/${id}`} className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{s.name}</span>
                            <span className="block text-xs text-base-content/50">
                              {formatMoney(t.outstandingCents, user.currency)} unpaid
                            </span>
                          </Link>
                          <SettleButton studentId={id} amountCents={t.outstandingCents} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              <Card title="Students" action={<Link href="/students" className="btn btn-ghost btn-sm">All</Link>}>
                <div className="flex flex-wrap gap-2 px-3 pt-1 pb-3">
                  {students
                    .filter((s) => !s.archived)
                    .map((s) => (
                      <Link
                        key={s.id}
                        href={`/students/${s.id}`}
                        className="flex items-center gap-2 rounded-full bg-base-200 py-1 pr-3 pl-1 text-sm font-medium transition hover:bg-base-300"
                      >
                        <Avatar name={s.name} color={s.color} size="sm" />
                        {s.name}
                      </Link>
                    ))}
                  <NewStudentButton className="btn btn-ghost btn-sm rounded-full" label="Add" />
                </div>
                <div className="flex items-center gap-2 px-3 pb-2 text-xs text-base-content/50">
                  <Users className="size-3.5" /> {students.filter((s) => !s.archived).length} active
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
