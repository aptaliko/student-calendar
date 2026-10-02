'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, PartyPopper } from 'lucide-react';
import type { Lesson, PaymentMethod, Student } from '@/db/schema';
import { PAYMENT_METHODS } from '@/db/schema';
import { api } from '@/lib/api';
import { monthLabel, shortDay } from '@/lib/dates';
import { colorOf } from '@/lib/lessons';
import { centsToInput, currencySymbol, formatMoney, parseMoney } from '@/lib/money';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments';
import Avatar from './Avatar';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { useToast } from './Toast';
import type { Prefs } from './Editors';

/** `from`/`to` (e.g. the report's month) pre-select only the unpaid lessons in that range. */
export type PaymentDefaults = { studentId?: number; from?: string; to?: string };

export default function PaymentDialog({
  defaults,
  students,
  prefs,
  onClose,
  onSaved,
}: {
  defaults?: PaymentDefaults;
  students: Student[];
  prefs: Prefs;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [studentId, setStudentId] = useState<number | null>(defaults?.studentId ?? null);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [date, setDate] = useState(prefs.today);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inRange = (l: Lesson) => (!defaults?.from || l.date >= defaults.from) && (!defaults?.to || l.date <= defaults.to);
  const hasRange = !!(defaults?.from || defaults?.to);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    api<Lesson[]>(`/api/lessons?studentId=${studentId}&unpaid=1`, 'GET')
      .then((list) => {
        if (cancelled) return;
        setLessons(list);
        const pre = list.filter((l) => (!defaults?.from || l.date >= defaults.from) && (!defaults?.to || l.date <= defaults.to));
        setSelected(new Set((pre.length ? pre : list).map((l) => l.id)));
      })
      .catch((err) => !cancelled && setError((err as Error).message));
    return () => {
      cancelled = true;
    };
  }, [studentId, defaults?.from, defaults?.to]);

  const chosen = useMemo(() => (lessons ?? []).filter((l) => selected.has(l.id)), [lessons, selected]);
  const sum = chosen.reduce((s, l) => s + l.priceCents, 0);
  const amountCents = amountTouched ? parseMoney(amount) : sum;
  const diff = amountCents === null ? 0 : amountCents - sum;
  const student = students.find((s) => s.id === studentId);

  function pickStudent(id: number) {
    if (id === studentId) return;
    setStudentId(id);
    setLessons(null);
    setSelected(new Set());
    setAmountTouched(false);
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectWhere = (pred: (l: Lesson) => boolean) => setSelected(new Set((lessons ?? []).filter(pred).map((l) => l.id)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return setError('Επιλέξτε μαθητή');
    if (chosen.length === 0) return setError('Επιλέξτε τουλάχιστον ένα μάθημα');
    if (amountCents === null || amountCents <= 0) return setError('Συμπληρώστε έγκυρο ποσό');
    setSaving(true);
    setError(null);
    try {
      await api('/api/payments', 'POST', { studentId, date, amountCents, method, notes, lessonIds: chosen.map((l) => l.id) });
      toast(`Καταχωρήθηκε πληρωμή ${formatMoney(amountCents, prefs.currency)} για ${chosen.length} ${chosen.length === 1 ? 'μάθημα' : 'μαθήματα'} 💸`);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const active = students.filter((s) => !s.archived || s.id === studentId);

  return (
    <Modal
      open
      onClose={onClose}
      title="Καταχώριση πληρωμής"
      footer={
        <>
          <div className="mr-auto pl-1 text-sm text-base-content/60 tabular">
            {chosen.length} {chosen.length === 1 ? 'μάθημα' : 'μαθήματα'}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Ακύρωση
          </button>
          <button type="submit" form="payment-form" className="btn btn-success" disabled={saving || chosen.length === 0}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            Καταχώριση {amountCents !== null && amountCents > 0 ? formatMoney(amountCents, prefs.currency) : ''}
          </button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="space-y-5">
        <section>
          <span className="mb-2 block text-sm font-medium">Μαθητής</span>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {active.map((s) => {
              const sel = s.id === studentId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickStudent(s.id)}
                  aria-pressed={sel}
                  className={`flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm font-medium transition ${
                    sel ? `${colorOf(s.color).soft} ${colorOf(s.color).border} border-2` : 'border-base-300 hover:bg-base-200'
                  }`}
                >
                  <Avatar name={s.name} color={s.color} size="sm" />
                  {s.name}
                </button>
              );
            })}
          </div>
        </section>

        {studentId && (
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">Απλήρωτα μαθήματα</span>
              {lessons && lessons.length > 0 && (
                <div className="flex gap-1">
                  {hasRange && defaults?.from && (
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => selectWhere(inRange)}>
                      {defaults.from.slice(0, 7) === defaults.to?.slice(0, 7) ? monthLabel(defaults.from) : 'Περιόδου'}
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => selectWhere(() => true)}>
                    <CheckCheck className="size-3.5" /> Όλα
                  </button>
                  <button type="button" className="btn btn-ghost btn-xs" onClick={() => setSelected(new Set())}>
                    Κανένα
                  </button>
                </div>
              )}
            </div>
            {lessons === null ? (
              <div className="flex justify-center py-6">
                <span className="loading loading-spinner text-primary" />
              </div>
            ) : lessons.length === 0 ? (
              <div className="flex flex-col items-center rounded-box bg-base-200 py-6 text-center">
                <PartyPopper className="size-7 text-success" />
                <p className="mt-2 font-semibold">Δεν υπάρχουν απλήρωτα μαθήματα</p>
                <p className="text-sm text-base-content/55">{student?.name} τα έχει εξοφλήσει όλα.</p>
              </div>
            ) : (
              <ul className="max-h-64 divide-y divide-base-200 overflow-y-auto rounded-box border border-base-300">
                {lessons.map((l) => (
                  <li key={l.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-base-200/60">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-success checkbox-sm"
                        checked={selected.has(l.id)}
                        onChange={() => toggle(l.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {shortDay(l.date)} · {l.startTime}
                        </span>
                        <span className="block text-xs text-base-content/55">
                          {l.durationMinutes}′{l.topic ? ` · ${l.topic}` : ''}
                        </span>
                      </span>
                      <StatusBadge status={l.status} />
                      <span className="w-20 text-right text-sm font-semibold tabular">{formatMoney(l.priceCents, prefs.currency)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {lessons && lessons.length > 0 && (
          <>
            <section className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Ποσό</span>
                <label className="input w-full">
                  <span className="text-base-content/50">{currencySymbol(prefs.currency)}</span>
                  <input
                    inputMode="decimal"
                    value={amountTouched ? amount : centsToInput(sum)}
                    onChange={(e) => {
                      setAmountTouched(true);
                      setAmount(e.target.value);
                    }}
                  />
                </label>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Ημερομηνία πληρωμής</span>
                <input type="date" className="input w-full" value={date} onChange={(e) => setDate(e.target.value)} required />
              </label>
              <p className="col-span-2 -mt-1 text-xs text-base-content/55 tabular">
                Σύνολο επιλεγμένων: {formatMoney(sum, prefs.currency)}
                {diff < 0 && <span className="text-warning"> · έκπτωση {formatMoney(-diff, prefs.currency)}</span>}
                {diff > 0 && <span className="text-info"> · επιπλέον {formatMoney(diff, prefs.currency)}</span>}
                {amountTouched && (
                  <button type="button" className="link link-primary ml-2 no-underline" onClick={() => setAmountTouched(false)}>
                    ίσο με το σύνολο
                  </button>
                )}
              </p>
            </section>

            <section>
              <span className="mb-2 block text-sm font-medium">Τρόπος πληρωμής</span>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`btn btn-sm rounded-full ${method === m ? 'btn-primary' : 'btn-ghost bg-base-200'}`}
                  >
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </section>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">Σημειώσεις</span>
              <input className="input w-full" placeholder="π.χ. Πληρωμή Οκτωβρίου" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </>
        )}

        {error && <div className="alert alert-error alert-soft text-sm">{error}</div>}
      </form>
    </Modal>
  );
}
