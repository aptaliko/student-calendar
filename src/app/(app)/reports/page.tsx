import Link from 'next/link';
import { BarChart3, ChevronLeft, ChevronRight, Clock3, Coins, Download, HandCoins, Percent, TrendingUp, Wallet } from 'lucide-react';
import { listPayments } from '@/db/queries/payments';
import { RecordPaymentButton } from '@/components/Actions';
import PaymentsList from '@/components/PaymentsList';
import { listLessons } from '@/db/queries/lessons';
import { listStudents } from '@/db/queries/students';
import Avatar from '@/components/Avatar';
import Card, { EmptyState, PageHeader } from '@/components/Card';
import MonthlyChart from '@/components/MonthlyChart';
import StatTile from '@/components/StatTile';
import { addMonths, endOfMonth, endOfYear, isValidISODate, monthLabel, startOfMonth, startOfYear, todayIn } from '@/lib/dates';
import { formatHours, formatMoney } from '@/lib/money';
import { totals, totalsByMonth, totalsByStudent } from '@/lib/reports';
import { requireUser } from '@/lib/session';

export const metadata = { title: 'Αναφορές' };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string; date?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayIn(user.timezone);
  const period = sp.period === 'year' ? 'year' : 'month';
  const date = sp.date && isValidISODate(sp.date) ? sp.date : today;
  const year = Number(date.slice(0, 4));

  const from = period === 'month' ? startOfMonth(date) : startOfYear(date);
  const to = period === 'month' ? endOfMonth(date) : endOfYear(date);
  const [students, yearLessons, periodPayments] = await Promise.all([
    listStudents(user.id),
    listLessons(user.id, { from: startOfYear(date), to: endOfYear(date) }),
    listPayments(user.id, { from, to }),
  ]);
  const lessons = yearLessons.filter((l) => l.date >= from && l.date <= to);

  const t = totals(lessons);
  const perStudent = [...totalsByStudent(lessons).entries()].sort((a, b) => b[1].earnedCents - a[1].earnedCents);
  const months = totalsByMonth(yearLessons, year).map(({ month, totals: mt }) => ({
    month,
    earnedCents: mt.earnedCents,
    attendedMinutes: mt.attendedMinutes,
    lessons: mt.attended + mt.noShow,
  }));
  const byId = new Map(students.map((s) => [s.id, s]));
  const perHour = t.attendedMinutes > 0 ? Math.round((t.earnedCents / t.attendedMinutes) * 60) : 0;

  const prev = period === 'month' ? addMonths(date, -1) : `${year - 1}-01-01`;
  const next = period === 'month' ? addMonths(date, 1) : `${year + 1}-01-01`;
  const label = period === 'month' ? monthLabel(date) : String(year);
  const link = (p: string, d: string) => `/reports?period=${p}&date=${d}`;

  const breakdown = [
    { label: 'Παρουσία', n: t.attended, cls: 'bg-success' },
    { label: 'Απουσία (χρεώνεται)', n: t.noShow, cls: 'bg-error' },
    { label: 'Δικαιολογημένη', n: t.excused, cls: 'bg-warning' },
    { label: 'Ακυρώθηκε', n: t.cancelled, cls: 'bg-base-content/25' },
    { label: 'Χωρίς καταχώριση', n: t.scheduled, cls: 'bg-base-content/10' },
  ];

  return (
    <div className="animate-rise space-y-6">
      <PageHeader title="Αναφορές" subtitle="Ώρες, παρουσίες και έσοδα με μια ματιά.">
        <RecordPaymentButton defaults={{ from, to }} className="btn btn-success btn-sm" />
        <a href={`/api/reports/export?from=${from}&to=${to}`} className="btn btn-ghost btn-sm" download>
          <Download className="size-4" /> Εξαγωγή σε Excel
        </a>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="join">
            <Link href={link(period, prev)} className="btn btn-ghost btn-square join-item" aria-label="Προηγούμενο">
              <ChevronLeft className="size-5" />
            </Link>
            <Link href={link(period, next)} className="btn btn-ghost btn-square join-item" aria-label="Επόμενο">
              <ChevronRight className="size-5" />
            </Link>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">{label}</h2>
        </div>
        <div role="tablist" className="tabs tabs-box tabs-sm">
          <Link role="tab" href={link('month', date)} className={`tab ${period === 'month' ? 'tab-active' : ''}`}>
            Μήνας
          </Link>
          <Link role="tab" href={link('year', date)} className={`tab ${period === 'year' ? 'tab-active' : ''}`}>
            Έτος
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={Clock3} label="Ώρες διδασκαλίας" value={formatHours(t.attendedMinutes)} hint={`${t.attended} μαθήματα με παρουσία`} />
        <StatTile icon={Coins} tone="secondary" label="Έσοδα" value={formatMoney(t.earnedCents, user.currency, { compact: true })} hint={`μαζί με ${t.noShow} χρεωμένες απουσίες`} />
        <StatTile icon={HandCoins} tone="success" label="Εισπράχθηκαν" value={formatMoney(t.paidCents, user.currency, { compact: true })} hint={`${formatMoney(t.outstandingCents, user.currency)} σε εκκρεμότητα`} />
        <StatTile icon={TrendingUp} tone="accent" label="Πραγματική χρέωση" value={perHour ? `${formatMoney(perHour, user.currency, { compact: true })}/ώρα` : '—'} hint={t.upcomingCents ? `${formatMoney(t.upcomingCents, user.currency)} ακόμη προγραμματισμένα` : 'ανά ώρα διδασκαλίας'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MonthlyChart data={months} currency={user.currency} highlight={period === 'month' ? date.slice(0, 7) : undefined} />
        </div>
        <div className="card-surface p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Percent className="size-5 text-primary" /> Παρουσίες
          </h2>
          <div className="mt-3 text-4xl font-extrabold tracking-tight tabular">
            {t.attendanceRate === null ? '—' : `${Math.round(t.attendanceRate * 100)}%`}
          </div>
          <p className="text-sm text-base-content/55">των καταχωρημένων μαθημάτων με παρουσία</p>
          {t.lessons > 0 && (
            <div className="mt-5 flex h-3 gap-[2px] overflow-hidden rounded-full">
              {breakdown
                .filter((b) => b.n > 0)
                .map((b) => (
                  <div key={b.label} className={b.cls} style={{ flexGrow: b.n }} title={`${b.label}: ${b.n}`} />
                ))}
            </div>
          )}
          <ul className="mt-4 space-y-2 text-sm">
            {breakdown.map((b) => (
              <li key={b.label} className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${b.cls}`} />
                <span className="flex-1 text-base-content/70">{b.label}</span>
                <span className="font-semibold tabular">{b.n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Card title={<span className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /> Ανά μαθητή</span>}>
        {perStudent.length === 0 ? (
          <EmptyState icon={<Wallet className="size-7" />} title={`Κανένα μάθημα (${label})`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Μαθητής</th>
                  <th className="text-right">Παρουσίες</th>
                  <th className="text-right">Ώρες</th>
                  <th className="hidden text-right sm:table-cell">Απουσίες</th>
                  <th className="hidden text-right sm:table-cell">Δικαιολ.</th>
                  <th className="hidden text-right md:table-cell">Ποσοστό</th>
                  <th className="text-right">Έσοδα</th>
                  <th className="hidden text-right md:table-cell">Πληρωμένα</th>
                  <th className="text-right">Οφειλή</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="tabular">
                {perStudent.map(([id, st]) => {
                  const s = byId.get(id);
                  return (
                    <tr key={id} className="hover:bg-base-200/60">
                      <td>
                        <Link href={`/students/${id}`} className="flex items-center gap-2 font-medium">
                          {s && <Avatar name={s.name} color={s.color} size="sm" />}
                          <span className="truncate">{s?.name ?? 'Διαγραμμένος'}</span>
                        </Link>
                      </td>
                      <td className="text-right">{st.attended}</td>
                      <td className="text-right">{formatHours(st.attendedMinutes)}</td>
                      <td className="hidden text-right sm:table-cell">{st.noShow}</td>
                      <td className="hidden text-right sm:table-cell">{st.excused}</td>
                      <td className="hidden text-right md:table-cell">{st.attendanceRate === null ? '—' : `${Math.round(st.attendanceRate * 100)}%`}</td>
                      <td className="text-right font-semibold">{formatMoney(st.earnedCents, user.currency)}</td>
                      <td className="hidden text-right md:table-cell">{formatMoney(st.paidCents, user.currency)}</td>
                      <td className={`text-right ${st.outstandingCents ? 'font-semibold text-warning' : 'text-base-content/40'}`}>
                        {formatMoney(st.outstandingCents, user.currency)}
                      </td>
                      <td className="text-right">
                        {st.outstandingCents > 0 && (
                          <RecordPaymentButton
                            defaults={{ studentId: id, from, to }}
                            className="btn btn-success btn-soft btn-xs btn-square"
                            label="Καταχώριση πληρωμής"
                            iconOnly
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="tabular">
                <tr>
                  <th>Σύνολο</th>
                  <th className="text-right">{t.attended}</th>
                  <th className="text-right">{formatHours(t.attendedMinutes)}</th>
                  <th className="hidden text-right sm:table-cell">{t.noShow}</th>
                  <th className="hidden text-right sm:table-cell">{t.excused}</th>
                  <th className="hidden text-right md:table-cell">{t.attendanceRate === null ? '—' : `${Math.round(t.attendanceRate * 100)}%`}</th>
                  <th className="text-right">{formatMoney(t.earnedCents, user.currency)}</th>
                  <th className="hidden text-right md:table-cell">{formatMoney(t.paidCents, user.currency)}</th>
                  <th className="text-right">{formatMoney(t.outstandingCents, user.currency)}</th>
                  <th />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      <Card
        title={
          <span className="flex items-center gap-2">
            <HandCoins className="size-5 text-success" /> Πληρωμές για μαθήματα: {label}
          </span>
        }
      >
        <PaymentsList payments={periodPayments} />
      </Card>
    </div>
  );
}
