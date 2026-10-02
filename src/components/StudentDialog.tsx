'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Student } from '@/db/schema';
import { api } from '@/lib/api';
import { STUDENT_COLOR_NAMES, STUDENT_COLORS } from '@/lib/lessons';
import { centsToInput, parseMoney, currencySymbol } from '@/lib/money';
import Modal from './Modal';
import { useToast } from './Toast';
import type { Prefs } from './Editors';

export default function StudentDialog({
  student,
  prefs,
  suggestedColor,
  onClose,
  onSaved,
}: {
  student?: Student;
  prefs: Prefs;
  suggestedColor: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(student?.name ?? '');
  const [email, setEmail] = useState(student?.email ?? '');
  const [phone, setPhone] = useState(student?.phone ?? '');
  const [rate, setRate] = useState(centsToInput(student?.hourlyRateCents ?? prefs.defaultRateCents));
  const [color, setColor] = useState(student?.color ?? suggestedColor);
  const [notes, setNotes] = useState(student?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const hourlyRateCents = parseMoney(rate);
    if (hourlyRateCents === null) return setError('Συμπληρώστε έγκυρη ωριαία χρέωση');
    setSaving(true);
    setError(null);
    try {
      const body = { name, email, phone, color, hourlyRateCents, notes };
      if (student) await api(`/api/students/${student.id}`, 'PATCH', body);
      else await api('/api/students', 'POST', body);
      toast(student ? 'Ο μαθητής ενημερώθηκε' : `Προστέθηκε: ${name} 🎉`);
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
      title={student ? 'Επεξεργασία μαθητή' : 'Νέος μαθητής'}
      footer={
        <>
          <button type="button" className="btn btn-ghost ml-auto" onClick={onClose}>
            Ακύρωση
          </button>
          <button type="submit" form="student-form" className="btn btn-primary" disabled={saving}>
            {saving && <span className="loading loading-spinner loading-sm" />}
            {student ? 'Αποθήκευση' : 'Προσθήκη μαθητή'}
          </button>
        </>
      }
    >
      <form id="student-form" onSubmit={submit} className="space-y-4">
        <label className="floating-label block">
          <span>Ονοματεπώνυμο</span>
          <input
            className="input input-lg w-full"
            placeholder="Ονοματεπώνυμο"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </label>

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

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Ωριαία χρέωση</span>
          <label className="input w-full">
            <span className="text-base-content/50">{currencySymbol(prefs.currency)}</span>
            <input inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} required />
            <span className="text-base-content/50">/ ώρα</span>
          </label>
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium">Χρώμα στο ημερολόγιο</span>
          <div className="flex flex-wrap gap-2">
            {STUDENT_COLOR_NAMES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                aria-pressed={color === c}
                className={`${STUDENT_COLORS[c].bg} grid size-9 place-items-center rounded-full text-white transition hover:scale-110 ${color === c ? 'ring-2 ring-base-content ring-offset-2 ring-offset-base-100' : ''}`}
              >
                {color === c && <Check className="size-4" />}
              </button>
            ))}
          </div>
        </div>

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
