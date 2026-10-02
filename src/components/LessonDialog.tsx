'use client';

import { useMemo, useState } from 'react';
import { Repeat, Trash2, UserPlus } from 'lucide-react';
import type { Lesson, LessonStatus, Student } from '@/db/schema';
import { api } from '@/lib/api';
import { LESSON_STATUS_ORDER, STATUS_META, colorOf } from '@/lib/lessons';
import { centsToInput, formatMoney, parseMoney, priceFor } from '@/lib/money';
import Avatar from './Avatar';
import Modal from './Modal';
import { useToast } from './Toast';
import type { Prefs } from './Editors';

export type LessonDefaults = { date?: string; startTime?: string; studentId?: number };

const DURATIONS = [30, 45, 60, 90, 120];

export default function LessonDialog({
  lesson,
  defaults,
  students,
  prefs,
  onClose,
  onSaved,
  onAddStudent,
}: {
  lesson?: Lesson;
  defaults?: LessonDefaults;
  students: Student[];
  prefs: Prefs;
  onClose: () => void;
  onSaved: () => void;
  onAddStudent: () => void;
}) {
  const toast = useToast();
  const active = useMemo(
    () => students.filter((s) => !s.archived || s.id === lesson?.studentId),
    [students, lesson?.studentId],
  );
  const [studentId, setStudentId] = useState<number | null>(
    lesson?.studentId ?? defaults?.studentId ?? (active.length === 1 ? active[0].id : null),
  );
  const [date, setDate] = useState(lesson?.date ?? defaults?.date ?? prefs.today);
  const [startTime, setStartTime] = useState(lesson?.startTime ?? defaults?.startTime ?? '16:00');
  const [duration, setDuration] = useState(lesson?.durationMinutes ?? prefs.defaultDurationMinutes);
  const [price, setPrice] = useState(lesson ? centsToInput(lesson.priceCents) : '');
  const [priceTouched, setPriceTouched] = useState(!!lesson);
  const [status, setStatus] = useState<LessonStatus>(lesson?.status ?? 'scheduled');
  const [paid, setPaid] = useState(lesson?.paid ?? false);
  const [topic, setTopic] = useState(lesson?.topic ?? '');
  const [notes, setNotes] = useState(lesson?.notes ?? '');
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState(8);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const student = students.find((s) => s.id === studentId);
  const autoPrice = student ? priceFor(student.hourlyRateCents, duration) : 0;
  const priceCents = priceTouched ? parseMoney(price) : autoPrice;
  const charged = STATUS_META[status].charged;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return setError('Pick a student');
    if (priceCents === null) return setError('Enter a valid price');
    setSaving(true);
    setError(null);
    const body = {
      studentId,
      date,
      startTime,
      durationMinutes: duration,
      priceCents,
      status,
      paid: charged && paid,
      topic,
      notes,
    };
    try {
      if (lesson) {
        await api(`/api/lessons/${lesson.id}`, 'PATCH', body);
        toast('Lesson updated');
      } else {
        const created = await api<Lesson[]>('/api/lessons', 'POST', { ...body, repeatWeeks: repeat ? weeks : 1 });
        toast(created.length > 1 ? `${created.length} weekly lessons scheduled` : 'Lesson scheduled');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function remove(series: boolean) {
    if (!lesson) return;
    const msg = series ? 'Delete this and all following lessons in the series?' : 'Delete this lesson?';
    if (!confirm(msg)) return;
    setSaving(true);
    try {
      const res = await api<{ count: number }>(`/api/lessons/${lesson.id}${series ? '?series=future' : ''}`, 'DELETE');
      toast(res.count > 1 ? `${res.count} lessons deleted` : 'Lesson deleted');
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={lesson ? 'Lesson' : 'New lesson'}
      footer={
        <>
          {lesson && (
            <div className="dropdown dropdown-top">
              <button type="button" tabIndex={0} className="btn btn-ghost btn-square text-error" aria-label="Delete">
                <Trash2 className="size-5" />
              </button>
              <ul tabIndex={0} className="menu dropdown-content z-20 w-60 rounded-box bg-base-100 p-2 shadow-xl">
                <li>
                  <button type="button" onClick={() => remove(false)}>
                    Delete this lesson
                  </button>
                </li>
                {lesson.seriesId && (
                  <li>
                    <button type="button" onClick={() => remove(true)}>
                      Delete this &amp; following
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}
          <div className="mr-auto pl-1 text-sm text-base-content/60 tabular">
            {priceCents !== null && formatMoney(priceCents, prefs.currency)}
            {!lesson && repeat && ` × ${weeks}`}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="lesson-form" className="btn btn-primary" disabled={saving}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            {lesson ? 'Save' : 'Schedule'}
          </button>
        </>
      }
    >
      <form id="lesson-form" onSubmit={submit} className="space-y-5">
        {/* Student */}
        <section>
          <span className="mb-2 block text-sm font-medium">Student</span>
          {active.length === 0 ? (
            <button type="button" onClick={onAddStudent} className="btn btn-outline btn-primary w-full">
              <UserPlus className="size-4" /> Add your first student
            </button>
          ) : (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {active.map((s) => {
                const selected = s.id === studentId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStudentId(s.id)}
                    aria-pressed={selected}
                    className={`flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm font-medium transition ${
                      selected
                        ? `${colorOf(s.color).soft} ${colorOf(s.color).border} border-2`
                        : 'border-base-300 hover:bg-base-200'
                    }`}
                  >
                    <Avatar name={s.name} color={s.color} size="sm" />
                    {s.name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onAddStudent}
                className="btn btn-ghost btn-circle btn-sm shrink-0 self-center"
                aria-label="Add student"
              >
                <UserPlus className="size-4" />
              </button>
            </div>
          )}
        </section>

        {/* When */}
        <section className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Date</span>
            <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Start</span>
            <input
              type="time"
              step={300}
              className="input w-full"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
        </section>

        <section>
          <span className="mb-2 block text-sm font-medium">Duration</span>
          <div className="flex flex-wrap items-center gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`btn btn-sm rounded-full ${duration === d ? 'btn-primary' : 'btn-ghost bg-base-200'}`}
              >
                {d < 60 ? `${d}m` : `${d / 60}h`.replace('.5h', '½h')}
              </button>
            ))}
            <label className="input input-sm w-28 rounded-full">
              <input
                type="number"
                min={5}
                max={600}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 0)}
                aria-label="Duration in minutes"
              />
              <span className="text-base-content/50">min</span>
            </label>
          </div>
        </section>

        <section>
          <span className="mb-1 block text-sm font-medium">Price</span>
          <label className="input w-full">
            <span className="text-base-content/50">{prefs.currency}</span>
            <input
              inputMode="decimal"
              value={priceTouched ? price : centsToInput(autoPrice)}
              onChange={(e) => {
                setPriceTouched(true);
                setPrice(e.target.value);
              }}
            />
            {priceTouched && student && (
              <button
                type="button"
                className="link link-primary text-xs no-underline"
                onClick={() => setPriceTouched(false)}
              >
                use rate
              </button>
            )}
          </label>
          {student && !priceTouched && (
            <p className="mt-1 text-xs text-base-content/50">
              From {student.name}&apos;s rate of {formatMoney(student.hourlyRateCents, prefs.currency)}/h
            </p>
          )}
        </section>

        {!lesson && (
          <section className="rounded-box bg-base-200 p-3">
            <label className="flex cursor-pointer items-center gap-3">
              <Repeat className="size-5 text-primary" />
              <span className="flex-1 text-sm font-medium">Repeat every week</span>
              <input type="checkbox" className="toggle toggle-primary" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            </label>
            {repeat && (
              <label className="mt-3 flex items-center gap-3 text-sm">
                <span className="flex-1">Number of lessons</span>
                <input
                  type="range"
                  min={2}
                  max={52}
                  value={weeks}
                  onChange={(e) => setWeeks(Number(e.target.value))}
                  className="range range-primary range-xs w-40"
                />
                <span className="w-8 text-right font-semibold tabular">{weeks}</span>
              </label>
            )}
          </section>
        )}

        {lesson && (
          <section>
            <span className="mb-2 block text-sm font-medium">Attendance</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LESSON_STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={status === s}
                  className={`flex items-center gap-2 rounded-field border px-3 py-2 text-left text-sm transition ${
                    status === s ? 'border-primary bg-primary/10 font-semibold' : 'border-base-300 hover:bg-base-200'
                  }`}
                >
                  <span className={`size-2.5 rounded-full ${STATUS_META[s].dot}`} />
                  {STATUS_META[s].short}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-base-content/50">
              {charged ? 'This lesson counts towards your income.' : 'This lesson is not charged.'}
            </p>
            {charged && (
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-box bg-base-200 p-3">
                <span className="flex-1 text-sm font-medium">Paid</span>
                <input type="checkbox" className="toggle toggle-success" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
              </label>
            )}
          </section>
        )}

        <section className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Topic</span>
            <input className="input w-full" placeholder="e.g. Chapter 4 — past tense" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Notes</span>
            <textarea className="textarea w-full" rows={2} placeholder="Homework, progress…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </section>

        {error && <div className="alert alert-error alert-soft text-sm">{error}</div>}
      </form>
    </Modal>
  );
}
