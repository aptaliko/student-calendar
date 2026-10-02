'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Lesson } from '@/db/schema';
import { layoutDay } from '@/lib/calendarLayout';
import {
  addDays,
  addMonths,
  dayMonth,
  longDay,
  minutesToTime,
  monthLabel,
  shortDay,
  WEEKDAY_SHORT,
} from '@/lib/dates';
import { STATUS_META, colorOf } from '@/lib/lessons';
import { formatMoney } from '@/lib/money';
import { useEditors } from './Editors';
import LessonRow from './LessonRow';

type Props = { view: 'month' | 'week'; date: string; today: string; days: string[]; lessons: Lesson[] };

const HOUR_PX = 56;

export default function CalendarView({ view, date, today, days, lessons }: Props) {
  const { students, prefs } = useEditors();
  const [filter, setFilter] = useState<number | null>(null);

  const visible = filter ? lessons.filter((l) => l.studentId === filter) : lessons;
  const byDate = useMemo(() => {
    const m = new Map<string, Lesson[]>();
    for (const l of visible) m.set(l.date, [...(m.get(l.date) ?? []), l]);
    return m;
  }, [visible]);

  const prev = view === 'month' ? addMonths(date, -1) : addDays(date, -7);
  const next = view === 'month' ? addMonths(date, 1) : addDays(date, 7);
  const href = (v: string, d: string) => `/calendar?view=${v}&date=${d}`;
  const title =
    view === 'month'
      ? monthLabel(date)
      : `${dayMonth(days[0])} – ${dayMonth(days[6], true)}`;

  const rangeEarned = visible
    .filter((l) => STATUS_META[l.status].charged && (view === 'week' || l.date.slice(0, 7) === date.slice(0, 7)))
    .reduce((s, l) => s + l.priceCents, 0);

  return (
    <div className="animate-rise space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="join">
            <Link href={href(view, prev)} className="btn btn-ghost btn-square join-item" aria-label="Previous">
              <ChevronLeft className="size-5" />
            </Link>
            <Link href={href(view, today)} className="btn btn-ghost join-item">
              Today
            </Link>
            <Link href={href(view, next)} className="btn btn-ghost btn-square join-item" aria-label="Next">
              <ChevronRight className="size-5" />
            </Link>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-base-content/55 tabular md:inline">
            Earned: <b className="text-base-content">{formatMoney(rangeEarned, prefs.currency)}</b>
          </span>
          <div role="tablist" className="tabs tabs-box tabs-sm">
            <Link role="tab" href={href('month', date)} className={`tab ${view === 'month' ? 'tab-active' : ''}`}>
              Month
            </Link>
            <Link role="tab" href={href('week', date)} className={`tab ${view === 'week' ? 'tab-active' : ''}`}>
              Week
            </Link>
          </div>
        </div>
      </div>

      {students.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => setFilter(null)}
            className={`btn btn-xs rounded-full ${filter === null ? 'btn-neutral' : 'btn-ghost bg-base-100'}`}
          >
            Everyone
          </button>
          {students
            .filter((s) => !s.archived)
            .map((s) => (
              <button
                key={s.id}
                onClick={() => setFilter(filter === s.id ? null : s.id)}
                className={`btn btn-xs shrink-0 rounded-full ${filter === s.id ? `${colorOf(s.color).bg} border-0 text-white` : 'btn-ghost bg-base-100'}`}
              >
                <span className={`size-2 rounded-full ${filter === s.id ? 'bg-white' : colorOf(s.color).bg}`} />
                {s.name}
              </button>
            ))}
        </div>
      )}

      {view === 'month' ? (
        <MonthView key={date.slice(0, 7)} date={date} today={today} days={days} byDate={byDate} />
      ) : (
        <WeekView today={today} days={days} byDate={byDate} />
      )}
    </div>
  );
}

function useStudentMap() {
  const { students } = useEditors();
  return useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
}

function Pill({ lesson }: { lesson: Lesson }) {
  const { editLesson } = useEditors();
  const studentById = useStudentMap();
  const s = studentById.get(lesson.studentId);
  const c = colorOf(s?.color ?? 'violet');
  const dim = lesson.status === 'cancelled' || lesson.status === 'excused';
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        editLesson(lesson);
      }}
      className={`flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium ${c.soft} ${c.text} ${dim ? 'line-through opacity-50' : ''}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${STATUS_META[lesson.status].dot}`} />
      <span className="tabular opacity-70">{lesson.startTime}</span>
      <span className="truncate">{s?.name}</span>
    </button>
  );
}

function MonthView({ date, today, days, byDate }: { date: string; today: string; days: string[]; byDate: Map<string, Lesson[]> }) {
  const { newLesson } = useEditors();
  const studentById = useStudentMap();
  const month = date.slice(0, 7);
  const [selected, setSelected] = useState(today.slice(0, 7) === month ? today : `${month}-01`);
  const selectedLessons = byDate.get(selected) ?? [];
  return (
    <>
      <div className="card-surface overflow-hidden">
        <div className="grid grid-cols-7 border-b border-base-300 bg-base-200/50">
          {WEEKDAY_SHORT.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold tracking-wide text-base-content/50 uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const inMonth = d.slice(0, 7) === month;
            const list = byDate.get(d) ?? [];
            const isToday = d === today;
            const isSelected = d === selected;
            return (
              <div
                key={d}
                role="button"
                tabIndex={0}
                onClick={() => (window.matchMedia('(min-width: 640px)').matches ? newLesson({ date: d }) : setSelected(d))}
                onKeyDown={(e) => e.key === 'Enter' && newLesson({ date: d })}
                className={`group relative min-h-16 cursor-pointer border-base-300 p-1 transition hover:bg-primary/5 sm:min-h-28 sm:p-1.5 ${
                  i % 7 !== 6 ? 'border-r' : ''
                } ${i < 35 ? 'border-b' : ''} ${inMonth ? '' : 'bg-base-200/40'} ${isSelected ? 'max-sm:bg-primary/10' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs font-semibold sm:size-7 sm:text-sm ${
                      isToday ? 'brand-gradient text-white shadow' : inMonth ? '' : 'text-base-content/35'
                    }`}
                  >
                    {Number(d.slice(8))}
                  </span>
                  <Plus className="hidden size-4 text-primary opacity-0 transition group-hover:opacity-100 sm:block" />
                </div>
                {/* Phones: dots. Larger screens: pills. */}
                <div className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                  {list.slice(0, 4).map((l) => (
                    <span key={l.id} className={`size-1.5 rounded-full ${colorOf(studentById.get(l.studentId)?.color ?? 'violet').bg}`} />
                  ))}
                </div>
                <div className="mt-1 hidden space-y-0.5 sm:block">
                  {list.slice(0, 3).map((l) => (
                    <Pill key={l.id} lesson={l} />
                  ))}
                  {list.length > 3 && (
                    <span className="block px-1.5 text-[11px] font-medium text-base-content/50">+{list.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda for the tapped day on phones */}
      <div className="card-surface p-2 sm:hidden">
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <h2 className="font-bold">{longDay(selected)}</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => newLesson({ date: selected })}>
            <Plus className="size-4" /> Add
          </button>
        </div>
        {selectedLessons.length === 0 ? (
          <p className="px-3 pb-4 text-sm text-base-content/50">No lessons.</p>
        ) : (
          <div className="divide-y divide-base-200">
            {selectedLessons.map((l) => (
              <LessonRow key={l.id} lesson={l} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function WeekView({ today, days, byDate }: { today: string; days: string[]; byDate: Map<string, Lesson[]> }) {
  const { newLesson, editLesson } = useEditors();
  const studentById = useStudentMap();
  const all = days.flatMap((d) => byDate.get(d) ?? []);
  const startHour = Math.min(8, ...all.map((l) => Number(l.startTime.slice(0, 2))));
  const endHour = Math.max(21, ...all.map((l) => Math.ceil((Number(l.startTime.slice(0, 2)) * 60 + Number(l.startTime.slice(3)) + l.durationMinutes) / 60)));
  const hours = Array.from({ length: Math.min(24, endHour) - startHour }, (_, i) => startHour + i);

  return (
    <>
      {/* Phones: agenda list */}
      <div className="space-y-3 sm:hidden">
        {days.map((d) => {
          const list = byDate.get(d) ?? [];
          return (
            <div key={d} className={`card-surface p-2 ${d === today ? 'ring-2 ring-primary/40' : ''}`}>
              <div className="flex items-center justify-between px-3 pt-1">
                <h2 className="font-bold">{shortDay(d)}</h2>
                <button className="btn btn-ghost btn-xs" onClick={() => newLesson({ date: d })} aria-label="Add lesson">
                  <Plus className="size-4" />
                </button>
              </div>
              {list.length === 0 ? (
                <p className="px-3 pb-2 text-sm text-base-content/40">Free</p>
              ) : (
                <div className="divide-y divide-base-200">
                  {list.map((l) => (
                    <LessonRow key={l.id} lesson={l} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Larger screens: time grid */}
      <div className="card-surface hidden overflow-hidden sm:block">
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-base-300 bg-base-200/50">
          <div />
          {days.map((d, i) => (
            <div key={d} className="py-2 text-center">
              <div className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">{WEEKDAY_SHORT[i]}</div>
              <div
                className={`mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-sm font-bold ${d === today ? 'brand-gradient text-white shadow' : ''}`}
              >
                {Number(d.slice(8))}
              </div>
            </div>
          ))}
        </div>
        <div className="max-h-[70dvh] overflow-y-auto">
          <div className="relative grid grid-cols-[3.5rem_repeat(7,1fr)]">
            <div>
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="pr-2 text-right text-[11px] text-base-content/45 tabular">
                  <span className="relative -top-2">{minutesToTime(h * 60)}</span>
                </div>
              ))}
            </div>
            {days.map((d) => (
              <div key={d} className={`relative border-l border-base-300 ${d === today ? 'bg-primary/[0.03]' : ''}`}>
                {hours.map((h) => (
                  <button
                    key={h}
                    style={{ height: HOUR_PX }}
                    onClick={() => newLesson({ date: d, startTime: minutesToTime(h * 60) })}
                    className="block w-full border-b border-base-200 transition hover:bg-primary/5"
                    aria-label={`New lesson ${d} ${h}:00`}
                  />
                ))}
                {layoutDay(byDate.get(d) ?? []).map(({ item: l, lane, lanes, start, end }) => {
                  const s = studentById.get(l.studentId);
                  const c = colorOf(s?.color ?? 'violet');
                  const dim = l.status === 'cancelled' || l.status === 'excused';
                  return (
                    <button
                      key={l.id}
                      onClick={() => editLesson(l)}
                      style={{
                        top: ((start - startHour * 60) / 60) * HOUR_PX + 1,
                        height: Math.max(((end - start) / 60) * HOUR_PX - 2, 20),
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                      }}
                      className={`absolute overflow-hidden rounded-lg border-l-4 ${c.border} ${c.soft} px-1.5 py-1 text-left text-xs shadow-sm backdrop-blur transition hover:z-10 hover:shadow-md ${dim ? 'opacity-50' : ''}`}
                    >
                      <span className={`block truncate font-semibold ${c.text} ${dim ? 'line-through' : ''}`}>{s?.name}</span>
                      <span className="block truncate text-[11px] text-base-content/60 tabular">
                        {l.startTime}–{minutesToTime(end)}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-base-content/60">
                        <span className={`size-1.5 rounded-full ${STATUS_META[l.status].dot}`} />
                        {STATUS_META[l.status].short}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
