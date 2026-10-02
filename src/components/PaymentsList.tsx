'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HandCoins, Trash2 } from 'lucide-react';
import type { PaymentWithCount } from '@/db/queries/payments';
import { api } from '@/lib/api';
import { shortDay } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { PAYMENT_METHOD_LABELS } from '@/lib/payments';
import Avatar from './Avatar';
import { EmptyState } from './Card';
import { useEditors } from './Editors';
import { useToast } from './Toast';

export default function PaymentsList({ payments, showStudent = true }: { payments: PaymentWithCount[]; showStudent?: boolean }) {
  const { students, prefs } = useEditors();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  const byId = new Map(students.map((s) => [s.id, s]));

  async function remove(p: PaymentWithCount) {
    const lessons = p.lessonCount === 1 ? 'Το 1 μάθημα θα σημειωθεί' : `Τα ${p.lessonCount} μαθήματα θα σημειωθούν`;
    if (!confirm(`Διαγραφή πληρωμής ${formatMoney(p.amountCents, prefs.currency)}; ${lessons} ξανά ως απλήρωτα.`)) return;
    setBusy(p.id);
    try {
      await api(`/api/payments/${p.id}`, 'DELETE');
      toast('Η πληρωμή διαγράφηκε');
      router.refresh();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  if (payments.length === 0) {
    return <EmptyState icon={<HandCoins className="size-7" />} title="Καμία πληρωμή" text="Οι πληρωμές που καταχωρείτε εμφανίζονται εδώ." />;
  }

  return (
    <ul className="divide-y divide-base-200">
      {payments.map((p) => {
        const s = byId.get(p.studentId);
        return (
          <li key={p.id} className="group flex items-center gap-3 px-3 py-2.5">
            {showStudent && s ? (
              <Avatar name={s.name} color={s.color} size="sm" />
            ) : (
              <span className="grid size-7 place-items-center rounded-full bg-success/15 text-success">
                <HandCoins className="size-4" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                {showStudent ? (s?.name ?? 'Διαγραμμένος') : shortDay(p.date)}
              </span>
              <span className="block truncate text-xs text-base-content/55">
                {showStudent && `${shortDay(p.date)} · `}
                {p.lessonCount} {p.lessonCount === 1 ? 'μάθημα' : 'μαθήματα'} · {PAYMENT_METHOD_LABELS[p.method]}
                {p.notes && ` · ${p.notes}`}
              </span>
            </span>
            <span className="font-semibold text-success tabular">+{formatMoney(p.amountCents, prefs.currency)}</span>
            <button
              onClick={() => remove(p)}
              disabled={busy === p.id}
              className="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-error"
              aria-label="Διαγραφή πληρωμής"
              title="Διαγραφή πληρωμής"
            >
              {busy === p.id ? <span className="loading loading-spinner loading-xs" /> : <Trash2 className="size-4" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
