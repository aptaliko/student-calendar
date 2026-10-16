'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, Users } from 'lucide-react';
import type { Student, StudentKind } from '@/db/schema';
import { shortDay } from '@/lib/dates';
import { formatHours, formatMoney } from '@/lib/money';
import Avatar from './Avatar';
import { EmptyState } from './Card';
import { NewStudentButton } from './Actions';
import { useEditors, type Prefs } from './Editors';

type Row = {
  student: Student;
  monthMinutes: number;
  outstandingCents: number;
  creditCents: number;
  attendanceRate: number | null;
  next: string | null;
};

type KindFilter = 'all' | StudentKind;

const KIND_FILTERS: [KindFilter, string][] = [
  ['all', 'Όλα'],
  ['student', 'Μαθητές'],
  ['class', 'Τμήματα'],
];

function matchesKind(student: Student, kindFilter: KindFilter): boolean {
  return kindFilter === 'all' || student.kind === kindFilter;
}

function matchesQuery(student: Student, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || student.name.toLowerCase().includes(q) || !!student.email?.toLowerCase().includes(q);
}

function filterRows(
  rows: Row[],
  { query, showArchived, kindFilter }: { query: string; showArchived: boolean; kindFilter: KindFilter },
): Row[] {
  return rows.filter((r) => r.student.archived === showArchived && matchesKind(r.student, kindFilter) && matchesQuery(r.student, query));
}

function KindFilterTabs({ value, onChange }: { value: KindFilter; onChange: (value: KindFilter) => void }) {
  return (
    <div role="tablist" className="tabs tabs-box tabs-sm">
      {KIND_FILTERS.map(([kind, label]) => (
        <button key={kind} role="tab" className={`tab ${value === kind ? 'tab-active' : ''}`} onClick={() => onChange(kind)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ArchivedTabs({ showArchived, archivedCount, onChange }: { showArchived: boolean; archivedCount: number; onChange: (value: boolean) => void }) {
  return (
    <div role="tablist" className="tabs tabs-box tabs-sm">
      <button role="tab" className={`tab ${!showArchived ? 'tab-active' : ''}`} onClick={() => onChange(false)}>
        Ενεργοί
      </button>
      <button role="tab" className={`tab ${showArchived ? 'tab-active' : ''}`} onClick={() => onChange(true)}>
        Αρχειοθετημένοι ({archivedCount})
      </button>
    </div>
  );
}

function StudentCard({ row, currency }: { row: Row; currency: Prefs['currency'] }) {
  const { student: s, monthMinutes, outstandingCents, creditCents, attendanceRate, next } = row;
  return (
    <Link href={`/students/${s.id}`} className="card-surface group flex flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <Avatar name={s.name} color={s.color} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">
            {s.name}
            {s.kind === 'class' && <span className="badge badge-outline badge-sm ml-2 align-middle">Τμήμα</span>}
          </div>
          <div className="truncate text-sm text-base-content/55">
            {formatMoney(s.hourlyRateCents, currency, { compact: true })}/ώρα
            {s.kind === 'class' && s.school && ` · ${s.school}`}
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
        {outstandingCents === 0 && creditCents > 0 ? (
          <div>
            <div className="font-bold text-info tabular">+{formatMoney(creditCents, currency, { compact: true })}</div>
            <div className="text-[11px] text-base-content/50">προπληρωμή</div>
          </div>
        ) : (
          <div>
            <div className={`font-bold tabular ${outstandingCents > 0 ? 'text-warning' : ''}`}>
              {formatMoney(outstandingCents, currency, { compact: true })}
            </div>
            <div className="text-[11px] text-base-content/50">οφειλή</div>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function StudentsList({ rows }: { rows: Row[] }) {
  const { prefs } = useEditors();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const filtered = filterRows(rows, { query, showArchived, kindFilter });
  const archivedCount = rows.filter((r) => r.student.archived).length;
  // The kind filter only appears once there is a class to filter by; a students-only teacher sees the old list.
  const hasClasses = rows.some((r) => r.student.kind === 'class');

  if (rows.length === 0) {
    return (
      <div className="card-surface">
        <EmptyState icon={<Users className="size-7" />} title="Δεν υπάρχουν μαθητές ή τμήματα ακόμη" text="Προσθέστε έναν μαθητή ή ένα τμήμα με την ωριαία χρέωσή του για να ξεκινήσετε τον προγραμματισμό.">
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
        {hasClasses && <KindFilterTabs value={kindFilter} onChange={setKindFilter} />}
        {archivedCount > 0 && <ArchivedTabs showArchived={showArchived} archivedCount={archivedCount} onChange={setShowArchived} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row) => (
          <StudentCard key={row.student.id} row={row} currency={prefs.currency} />
        ))}
      </div>
      {filtered.length === 0 && <p className="py-10 text-center text-base-content/50">Κανένας μαθητής δεν ταιριάζει με «{query}».</p>}
    </div>
  );
}
