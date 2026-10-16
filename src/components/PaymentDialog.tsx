'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, Info } from 'lucide-react';
import type { PaymentMethod, Student } from '@/db/schema';
import { PAYMENT_METHODS } from '@/db/schema';
import type { LessonWithPaid } from '@/db/queries/lessons';
import type { PaymentResult } from '@/db/queries/payments';
import { api } from '@/lib/api';
import { monthLabel, shortDay } from '@/lib/dates';
import { colorOf } from '@/lib/lessons';
import { centsToInput, currencySymbol, formatMoney, parseMoney } from '@/lib/money';
import { PAYMENT_METHOD_LABELS, packageShare } from '@/lib/payments';
import Avatar from './Avatar';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import { useToast } from './Toast';
import type { Prefs } from './Editors';

/** `from`/`to` (e.g. the report's month) pre-select only the unpaid lessons in that range. */
export type PaymentDefaults = { studentId?: number; from?: string; to?: string; mode?: 'lessons' | 'package' };

const due = (l: LessonWithPaid) => Math.max(0, l.priceCents - (l.allocatedCents ?? 0));
const lessonsWord = (n: number) => `${n} ${n === 1 ? 'μάθημα' : 'μαθήματα'}`;

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
  const [mode, setMode] = useState<'lessons' | 'package'>(defaults?.mode ?? 'lessons');
  const [lessons, setLessons] = useState<LessonWithPaid[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [shortfall, setShortfall] = useState<'discount' | 'oldest'>('discount');
  const [packageSize, setPackageSize] = useState(10);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inRange = (l: LessonWithPaid) => (!defaults?.from || l.date >= defaults.from) && (!defaults?.to || l.date <= defaults.to);
  const hasRange = !!(defaults?.from || defaults?.to);

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;
    api<LessonWithPaid[]>(`/api/lessons?studentId=${studentId}&unpaid=1`, 'GET')
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
  const chosenDue = chosen.reduce((s, l) => s + due(l), 0);
  const isPackage = mode === 'package';
  const amountCents = amountTouched || isPackage ? parseMoney(amount) : chosenDue;
  const extra = !isPackage && amountCents !== null ? amountCents - chosenDue : 0;
  const unticked = (lessons ?? []).filter((l) => !selected.has(l.id));
  const student = students.find((s) => s.id === studentId);
  const perLesson = isPackage && amountCents && packageSize > 0 ? packageShare(amountCents, packageSize, 0) : 0;
  const packageNow = Math.min(packageSize, lessons?.length ?? 0);

  function pickStudent(id: number) {
    if (id === studentId) return;
    setStudentId(id);
    setLessons(null);
    setSelected(new Set());
    setAmountTouched(false);
  }

  function switchMode(m: 'lessons' | 'package') {
    setMode(m);
    setAmountTouched(false);
    setAmount('');
    setError(null);
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectWhere = (pred: (l: LessonWithPaid) => boolean) => setSelected(new Set((lessons ?? []).filter(pred).map((l) => l.id)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return setError('Επιλέξτε μαθητή');
    if (amountCents === null || amountCents <= 0) return setError('Συμπληρώστε έγκυρο ποσό');
    if (isPackage && (!packageSize || packageSize < 1)) return setError('Συμπληρώστε τον αριθμό μαθημάτων του πακέτου');
    setSaving(true);
    setError(null);
    try {
      const res = await api<PaymentResult>('/api/payments', 'POST', {
        studentId,
        amountCents,
        method,
        notes,
        lessonIds: isPackage ? [] : chosen.map((l) => l.id),
        shortfall,
        lessonCount: isPackage ? packageSize : null,
      });
      const parts = [`Καταχωρήθηκαν ${formatMoney(amountCents, prefs.currency)}`];
      if (res.lessonsPaid) parts.push(`εξοφλήθηκαν ${lessonsWord(res.lessonsPaid)}`);
      if (res.credit.lessons) parts.push(`απομένουν ${lessonsWord(res.credit.lessons)} στο πακέτο`);
      else if (res.credit.cents > 0) parts.push(`${formatMoney(res.credit.cents, prefs.currency)} προπληρωμή`);
      toast(`${parts.join(' · ')} 💸`);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  // Opened for a specific student (their page, their report row): show just them.
  const active = defaults?.studentId ? students.filter((s) => s.id === defaults.studentId) : students.filter((s) => !s.archived || s.id === studentId);
  const canSubmit = !!studentId && lessons !== null && amountCents !== null && amountCents > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Καταχώριση πληρωμής"
      footer={
        <>
          <button type="button" className="btn btn-ghost ml-auto" onClick={onClose}>
            Ακύρωση
          </button>
          <button type="submit" form="payment-form" className="btn btn-success" disabled={saving || !canSubmit}>
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

        <div role="tablist" className="tabs tabs-box tabs-sm w-fit">
          <button type="button" role="tab" className={`tab ${!isPackage ? 'tab-active' : ''}`} onClick={() => switchMode('lessons')}>
            Πληρωμή / προπληρωμή
          </button>
          <button type="button" role="tab" className={`tab ${isPackage ? 'tab-active' : ''}`} onClick={() => switchMode('package')}>
            Πακέτο μαθημάτων
          </button>
        </div>

        {studentId && lessons === null && (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner text-primary" />
          </div>
        )}

        {studentId && lessons !== null && !isPackage && (
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">Απλήρωτα μαθήματα</span>
              {lessons.length > 0 && (
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
            {lessons.length === 0 ? (
              <p className="rounded-box bg-base-200 px-3 py-3 text-sm text-base-content/70">
                {student?.name} δεν χρωστάει τίποτα. Το ποσό θα μείνει ως <b>προπληρωμή</b> και θα εξοφλεί αυτόματα τα επόμενα μαθήματα.
              </p>
            ) : (
              <ul className="max-h-56 divide-y divide-base-200 overflow-y-auto rounded-box border border-base-300">
                {lessons.map((l) => (
                  <li key={l.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-base-200/60">
                      <input type="checkbox" className="checkbox checkbox-success checkbox-sm" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {shortDay(l.date)} · {l.startTime}
                        </span>
                        <span className="block text-xs text-base-content/55">
                          {l.durationMinutes}′{l.topic ? ` · ${l.topic}` : ''}
                          {l.allocatedCents > 0 && ` · έχουν δοθεί ${formatMoney(l.allocatedCents, prefs.currency)}`}
                        </span>
                      </span>
                      <StatusBadge status={l.status} />
                      <span className="w-20 text-right text-sm font-semibold tabular">{formatMoney(due(l), prefs.currency)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {studentId && lessons !== null && (
          <>
            <section className={isPackage ? 'grid grid-cols-2 gap-3' : ''}>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{isPackage ? 'Τιμή πακέτου' : 'Ποσό'}</span>
                <label className="input w-full">
                  <span className="text-base-content/50">{currencySymbol(prefs.currency)}</span>
                  <input
                    inputMode="decimal"
                    placeholder={isPackage ? 'π.χ. 230' : '0'}
                    value={amountTouched || isPackage ? amount : chosenDue ? centsToInput(chosenDue) : ''}
                    onChange={(e) => {
                      setAmountTouched(true);
                      setAmount(e.target.value);
                    }}
                  />
                </label>
              </label>
              {isPackage && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Αριθμός μαθημάτων</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    className="input w-full"
                    value={packageSize || ''}
                    onChange={(e) => setPackageSize(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  />
                </label>
              )}
            </section>

            {/* What will happen */}
            {amountCents !== null && amountCents > 0 && (
              <div className="flex gap-2 rounded-box bg-info/10 px-3 py-2.5 text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-info" />
                <div className="space-y-1">
                  {isPackage ? (
                    <>
                      <p>
                        <b>{formatMoney(perLesson, prefs.currency)}</b> ανά μάθημα.
                      </p>
                      <p>
                        {packageNow > 0 && <>Εξοφλεί τώρα {lessonsWord(packageNow)} που χρωστάει (παλαιότερα πρώτα). </>}
                        {packageSize - packageNow > 0 && <>Τα υπόλοιπα {packageSize - packageNow} θα χρησιμοποιηθούν αυτόματα στα επόμενα μαθήματα.</>}
                      </p>
                    </>
                  ) : extra >= 0 ? (
                    <>
                      {chosen.length > 0 && <p>Εξοφλούνται {lessonsWord(chosen.length)} ({formatMoney(chosenDue, prefs.currency)}).</p>}
                      {extra > 0 && (
                        <p>
                          <b>{formatMoney(extra, prefs.currency)}</b> μένουν ως προπληρωμή
                          {unticked.length > 0 ? ' — πρώτα για τα μη επιλεγμένα απλήρωτα μαθήματα (παλαιότερα πρώτα), μετά για τα επόμενα.' : ' για τα επόμενα μαθήματα.'}
                        </p>
                      )}
                      {amountTouched && (
                        <button type="button" className="link link-primary text-xs no-underline" onClick={() => setAmountTouched(false)}>
                          ίσο με το σύνολο
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p>Το ποσό είναι {formatMoney(-extra, prefs.currency)} λιγότερο από το σύνολο ({formatMoney(chosenDue, prefs.currency)}):</p>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input type="radio" className="radio radio-xs radio-primary mt-1" checked={shortfall === 'discount'} onChange={() => setShortfall('discount')} />
                        <span>
                          <b>Έκπτωση</b> — εξοφλούνται όλα τα επιλεγμένα
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2">
                        <input type="radio" className="radio radio-xs radio-primary mt-1" checked={shortfall === 'oldest'} onChange={() => setShortfall('oldest')} />
                        <span>
                          <b>Μερική πληρωμή</b> — εξοφλούνται τα παλαιότερα, το υπόλοιπο μένει οφειλή
                        </span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

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
              <input
                className="input w-full"
                placeholder={isPackage ? 'π.χ. Πακέτο Οκτωβρίου' : 'π.χ. Σεπτέμβριος + προπληρωμή Οκτωβρίου'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </>
        )}

        {error && <div className="alert alert-error alert-soft text-sm">{error}</div>}
      </form>
    </Modal>
  );
}
