'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, Users } from 'lucide-react';
import type { Student } from '@/db/schema';
import { shortDay } from '@/lib/dates';
import { formatHours, formatMoney } from '@/lib/money';
import Avatar from './Avatar';
import { EmptyState } from './Card';
import { NewStudentButton } from './Actions';
import { useEditors } from './Editors';

type Row = {
  student: Student;
  monthMinutes: number;
  outstandingCents: number;
  attendanceRate: number | null;
  next: string | null;
};

export default function StudentsList({ rows }: { rows: Row[] }) {
  const { prefs } = useEditors();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const q = query.trim().toLowerCase();
  const filtered = rows.filter(
    (r) =>
      r.student.archived === showArchived &&
      (!q || r.student.name.toLowerCase().includes(q) || r.student.email?.toLowerCase().includes(q)),
  );
  const archivedCount = rows.filter((r) => r.student.archived).length;

  if (rows.length === 0) {
    return (
      <div className="card-surface">
        <EmptyState icon={<Users className="size-7" />} title="Δεν υπάρχουν μαθητές ακόμη" text="Προσθέστε έναν μαθητή με την ωριαία χρέωσή του για να ξεκινήσετε τον προγραμματισμό.">
          <NewStudentButton />
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="input flex-1 sm:max-w-xs">
          <Search className="size-4 opacity-50" />
          <input type="search" placeholder="Αναζήτηση μαθητών" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {archivedCount > 0 && (
          <div role="tablist" className="tabs tabs-box tabs-sm">
            <button role="tab" className={`tab ${!showArchived ? 'tab-active' : ''}`} onClick={() => setShowArchived(false)}>
              Ενεργοί
            </button>
            <button role="tab" className={`tab ${showArchived ? 'tab-active' : ''}`} onClick={() => setShowArchived(true)}>
              Αρχειοθετημένοι ({archivedCount})
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(({ student: s, monthMinutes, outstandingCents, attendanceRate, next }) => (
          <Link
            key={s.id}
            href={`/students/${s.id}`}
            className="card-surface group flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center gap-3">
              <Avatar name={s.name} color={s.color} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-lg font-bold">{s.name}</div>
                <div className="truncate text-sm text-base-content/55">
                  {formatMoney(s.hourlyRateCents, prefs.currency, { compact: true })}/ώρα
                  {next && ` · επόμενο ${shortDay(next.slice(0, 10))} ${next.slice(11)}`}
                </div>
              </div>
              <ChevronRight className="size-5 text-base-content/30 transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-box bg-base-200/70 p-2 text-center">
              <div>
                <div className="font-bold tabular">{formatHours(monthMinutes)}</div>
                <div className="text-[11px] text-base-content/50">αυτόν τον μήνα</div>
              </div>
              <div>
                <div className="font-bold tabular">{attendanceRate === null ? '—' : `${Math.round(attendanceRate * 100)}%`}</div>
                <div className="text-[11px] text-base-content/50">παρουσίες</div>
              </div>
              <div>
                <div className={`font-bold tabular ${outstandingCents > 0 ? 'text-warning' : ''}`}>
                  {formatMoney(outstandingCents, prefs.currency, { compact: true })}
                </div>
                <div className="text-[11px] text-base-content/50">οφειλή</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <p className="py-10 text-center text-base-content/50">Κανένας μαθητής δεν ταιριάζει με «{query}».</p>}
    </div>
  );
}
