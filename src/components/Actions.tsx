'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, UserPlus, Wallet } from 'lucide-react';
import type { Student } from '@/db/schema';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { LessonDefaults } from './LessonDialog';
import { useEditors } from './Editors';
import { useToast } from './Toast';

export function NewLessonButton({
  defaults,
  className = 'btn btn-primary',
  label = 'Νέο μάθημα',
}: {
  defaults?: LessonDefaults;
  className?: string;
  label?: string;
}) {
  const { newLesson } = useEditors();
  return (
    <button className={className} onClick={() => newLesson(defaults)}>
      <Plus className="size-4" /> {label}
    </button>
  );
}

export function NewStudentButton({ className = 'btn btn-primary', label = 'Προσθήκη μαθητή' }: { className?: string; label?: string }) {
  const { newStudent } = useEditors();
  return (
    <button className={className} onClick={newStudent}>
      <UserPlus className="size-4" /> {label}
    </button>
  );
}

export function EditStudentButton({ student }: { student: Student }) {
  const { editStudent } = useEditors();
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => editStudent(student)}>
      <Pencil className="size-4" /> Επεξεργασία
    </button>
  );
}

export function SettleButton({
  studentId,
  amountCents,
  className = 'btn btn-success btn-soft btn-sm',
}: {
  studentId: number;
  amountCents: number;
  className?: string;
}) {
  const { prefs } = useEditors();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function settle() {
    if (!confirm(`Να σημειωθούν ${formatMoney(amountCents, prefs.currency)} ως εξοφλημένα;`)) return;
    setBusy(true);
    try {
      const res = await api<{ count: number }>(`/api/students/${studentId}/settle`, 'POST');
      toast(res.count === 1 ? '1 μάθημα σημειώθηκε ως πληρωμένο 💸' : `${res.count} μαθήματα σημειώθηκαν ως πληρωμένα 💸`);
      router.refresh();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className={className} onClick={settle} disabled={busy}>
      {busy ? <span className="loading loading-spinner loading-xs" /> : <Wallet className="size-4" />}
      Εξόφληση
    </button>
  );
}
