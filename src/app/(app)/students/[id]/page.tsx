import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock, Clock3, Coins, History, Mail, Percent, Phone, Wallet } from 'lucide-react';
import { listStudentLessons } from '@/db/queries/lessons';
import { getStudent } from '@/db/queries/students';
import Avatar from '@/components/Avatar';
import Card, { EmptyState } from '@/components/Card';
import LessonRow from '@/components/LessonRow';
import StatTile from '@/components/StatTile';
import StudentMenu from '@/components/StudentMenu';
import { EditStudentButton, NewLessonButton, SettleButton } from '@/components/Actions';
import { monthLabel, todayIn } from '@/lib/dates';
import { formatHours, formatMoney } from '@/lib/money';
import { totals } from '@/lib/reports';
import { requireUser } from '@/lib/session';

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const student = await getStudent(user.id, Number((await params).id));
  if (!student) notFound();

  const today = todayIn(user.timezone);
  const lessons = await listStudentLessons(user.id, student.id); // newest first
  const t = totals(lessons);
  const upcoming = lessons.filter((l) => l.date >= today && l.status === 'scheduled').reverse();
  const past = lessons.filter((l) => !(l.date >= today && l.status === 'scheduled'));

  const months = new Map<string, typeof past>();
  for (const l of past) months.set(l.date.slice(0, 7), [...(months.get(l.date.slice(0, 7)) ?? []), l]);

  return (
    <div className="animate-rise space-y-6">
      <Link href="/students" className="btn btn-ghost btn-sm -ml-2">
        <ArrowLeft className="size-4" /> Students
      </Link>

      <div className="card-surface relative overflow-hidden p-5 sm:p-6">
        <div className="brand-gradient absolute inset-x-0 top-0 h-20 opacity-90" />
        <div className="relative flex flex-wrap items-end gap-4 pt-8">
          <Avatar name={student.name} color={student.color} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              {student.name}
              {student.archived && <span className="badge badge-neutral badge-sm">Archived</span>}
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-base-content/60">
              <span>{formatMoney(student.hourlyRateCents, user.currency)}/hour</span>
              {student.email && (
                <a href={`mailto:${student.email}`} className="flex items-center gap-1 hover:text-primary">
                  <Mail className="size-3.5" /> {student.email}
                </a>
              )}
              {student.phone && (
                <a href={`tel:${student.phone}`} className="flex items-center gap-1 hover:text-primary">
                  <Phone className="size-3.5" /> {student.phone}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <EditStudentButton student={student} />
            <StudentMenu student={student} />
            <NewLessonButton defaults={{ studentId: student.id }} className="btn btn-primary btn-sm" label="Schedule" />
          </div>
        </div>
        {student.notes && <p className="relative mt-4 rounded-box bg-base-200 p-3 text-sm whitespace-pre-line">{student.notes}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Clock3} label="Hours taught" value={formatHours(t.attendedMinutes)} hint={`${t.attended} lessons attended`} />
        <StatTile icon={Coins} tone="secondary" label="Earned" value={formatMoney(t.earnedCents, user.currency, { compact: true })} hint="all time" />
        <StatTile
          icon={Percent}
          tone="success"
          label="Attendance"
          value={t.attendanceRate === null ? '—' : `${Math.round(t.attendanceRate * 100)}%`}
          hint={`${t.noShow} no-show · ${t.excused} excused`}
        />
        <StatTile icon={Wallet} tone="warning" label="Owes you" value={formatMoney(t.outstandingCents, user.currency, { compact: true })} hint={`${formatMoney(t.paidCents, user.currency)} paid`} />
      </div>

      {t.outstandingCents > 0 && (
        <div className="alert alert-warning alert-soft">
          <Wallet className="size-5" />
          <span>
            {student.name} has <b>{formatMoney(t.outstandingCents, user.currency)}</b> outstanding.
          </span>
          <SettleButton studentId={student.id} amountCents={t.outstandingCents} className="btn btn-sm btn-warning" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-2" title={<span className="flex items-center gap-2"><CalendarClock className="size-5 text-primary" /> Upcoming</span>}>
          {upcoming.length === 0 ? (
            <EmptyState icon={<CalendarClock className="size-7" />} title="Nothing scheduled">
              <NewLessonButton defaults={{ studentId: student.id }} className="btn btn-primary btn-sm" label="Schedule weekly lessons" />
            </EmptyState>
          ) : (
            <div className="divide-y divide-base-200">
              {upcoming.slice(0, 8).map((l) => (
                <LessonRow key={l.id} lesson={l} showStudent={false} showDate />
              ))}
              {upcoming.length > 8 && <p className="px-3 py-2 text-sm text-base-content/50">+{upcoming.length - 8} more</p>}
            </div>
          )}
        </Card>

        <Card className="min-w-0 lg:col-span-3" title={<span className="flex items-center gap-2"><History className="size-5 text-primary" /> History</span>}>
          {months.size === 0 ? (
            <EmptyState icon={<History className="size-7" />} title="No past lessons yet" />
          ) : (
            [...months.entries()].map(([month, list]) => {
              const mt = totals(list);
              return (
                <div key={month} className="mb-2">
                  <div className="sticky top-14 z-[1] flex items-center justify-between rounded-field bg-base-200/90 px-3 py-1.5 text-sm backdrop-blur lg:top-0">
                    <span className="font-semibold">{monthLabel(`${month}-01`)}</span>
                    <span className="text-base-content/60 tabular">
                      {formatHours(mt.attendedMinutes)} · {formatMoney(mt.earnedCents, user.currency)}
                    </span>
                  </div>
                  <div className="divide-y divide-base-200">
                    {list.map((l) => (
                      <LessonRow key={l.id} lesson={l} showStudent={false} showDate />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
