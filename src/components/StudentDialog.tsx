'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Student, StudentKind } from '@/db/schema';
import { api } from '@/lib/api';
import { STUDENT_COLOR_NAMES, STUDENT_COLORS } from '@/lib/lessons';
import { centsToInput, parseMoney, currencySymbol } from '@/lib/money';
import Modal from './Modal';
import { useToast } from './Toast';
import type { Prefs } from './Editors';

// All kind-specific copy lives here so the JSX reads the same for both kinds.
const COPY: Record<
  StudentKind,
  { newTitle: string; editTitle: string; nameLabel: string; newSubmit: string; updated: string }
> = {
  student: {
    newTitle: 'Νέος μαθητής',
    editTitle: 'Επεξεργασία μαθητή',
    nameLabel: 'Ονοματεπώνυμο',
    newSubmit: 'Προσθήκη μαθητή',
    updated: 'Ο μαθητής ενημερώθηκε',
  },
  class: {
    newTitle: 'Νέο τμήμα',
    editTitle: 'Επεξεργασία τμήματος',
    nameLabel: 'Όνομα τμήματος',
    newSubmit: 'Προσθήκη τμήματος',
    updated: 'Το τμήμα ενημερώθηκε',
  },
};

const KIND_OPTIONS: { kind: StudentKind; label: string }[] = [
  { kind: 'student', label: 'Μαθητής' },
  { kind: 'class', label: 'Τμήμα' },
];

// The kind can be picked at creation only; an existing row shows it locked.
function KindTabs({ kind, locked, onChange }: { kind: StudentKind; locked: boolean; onChange: (kind: StudentKind) => void }) {
  return (
    <div role="tablist" className="tabs tabs-box w-full">
      {KIND_OPTIONS.map((opt) => (
        <button
          key={opt.kind}
          type="button"
          role="tab"
          aria-selected={kind === opt.kind}
          className={`tab flex-1 ${kind === opt.kind ? 'tab-active' : ''}`}
          disabled={locked}
          onClick={() => onChange(opt.kind)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium">Χρώμα στο ημερολόγιο</span>
      <div className="flex flex-wrap gap-2">
        {STUDENT_COLOR_NAMES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            aria-pressed={color === c}
            className={`${STUDENT_COLORS[c].bg} grid size-9 place-items-center rounded-full text-white transition hover:scale-110 ${color === c ? 'ring-2 ring-base-content ring-offset-2 ring-offset-base-100' : ''}`}
          >
            {color === c && <Check className="size-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StudentDialog({
  student,
  kind: initialKind = 'student',
  prefs,
  suggestedColor,
  onClose,
  onSaved,
}: {
  student?: Student;
  kind?: StudentKind;
  prefs: Prefs;
  suggestedColor: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [kind, setKind] = useState<StudentKind>(student?.kind ?? initialKind);
  const copy = COPY[kind];
  const isClass = kind === 'class';
  const [name, setName] = useState(student?.name ?? '');
  const [school, setSchool] = useState(student?.school ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [phone, setPhone] = useState(student?.phone ?? '');
  const [rate, setRate] = useState(centsToInput(student?.hourlyRateCents ?? prefs.defaultRateCents));
  const [color, setColor] = useState(student?.color ?? suggestedColor);
  const [notes, setNotes] = useState(student?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The kind is fixed once a row exists, so the PATCH body never carries it.
  async function save(hourlyRateCents: number) {
    const fields = { name, email, phone, color, hourlyRateCents, notes, school: isClass ? school : '' };
    if (student) {
      await api(`/api/students/${student.id}`, 'PATCH', fields);
      toast(COPY[student.kind].updated);
    } else {
      await api('/api/students', 'POST', { ...fields, kind });
      toast(`Προστέθηκε: ${name} 🎉`);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const hourlyRateCents = parseMoney(rate);
    if (hourlyRateCents === null) return setError('Συμπληρώστε έγκυρη ωριαία χρέωση');
    setSaving(true);
    setError(null);
    try {
      await save(hourlyRateCents);
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
      title={student ? copy.editTitle : copy.newTitle}
      footer={
        <>
          <button type="button" className="btn btn-ghost ml-auto" onClick={onClose}>
            Ακύρωση
          </button>
          <button type="submit" form="student-form" className="btn btn-primary" disabled={saving}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            {student ? 'Αποθήκευση' : copy.newSubmit}
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={submit} className="space-y-4">
        <KindTabs kind={kind} locked={!!student} onChange={setKind} />

        <label className="floating-label block">
          <span>{copy.nameLabel}</span>
          <input
            className="input input-lg w-full"
            placeholder={copy.nameLabel}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </label>

        {isClass && (
          <label className="floating-label block">
            <span>Σχολείο</span>
            <input className="input w-full" placeholder="Σχολείο" value={school} onChange={(e) => setSchool(e.target.value)} />
          </label>
        )}

        {!isClass && (
          <div className="grid grid-cols-2 gap-3">
            <label className="floating-label block">
              <span>Email</span>
              <input type="email" className="input w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="floating-label block">
              <span>Τηλέφωνο</span>
              <input type="tel" className="input w-full" placeholder="Τηλέφωνο" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Ωριαία χρέωση</span>
          <label className="input w-full">
            <span className="text-base-content/50">{currencySymbol(prefs.currency)}</span>
            <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} required />
            <span className="text-base-content/50">/ ώρα</span>
          </label>
        </label>

        <ColorPicker color={color} onChange={setColor} />

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Σημειώσεις</span>
          <textarea
            className="textarea w-full"
            rows={3}
            placeholder="Επίπεδο, στόχοι, επικοινωνία με γονείς…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        {error && <div className="alert alert-error alert-soft text-sm">{error}</div>}
      </form>
    </Modal>
  );
}
