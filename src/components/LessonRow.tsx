'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CircleDollarSign, UserX, X } from 'lucide-react';
import type { Lesson, LessonStatus } from '@/db/schema';
import { api } from '@/lib/api';
import { minutesToTime, shortDay, timeToMinutes } from '@/lib/dates';
import { STATUS_META, colorOf } from '@/lib/lessons';
import { formatMoney } from '@/lib/money';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import { useEditors } from './Editors';
import { useToast } from './Toast';

/**
 * One lesson as a tappable row, with one-tap attendance buttons while it is unmarked
 * and a paid toggle once it is charged. Updates optimistically, then refreshes.
 */
/** Keyed on the server values so optimistic overrides reset whenever fresh data arrives. */
export default function LessonRow(props: { lesson: Lesson; showDate?: boolean; showStudent?: boolean }) {
  const { lesson } = props;
  return <LessonRowInner key={`${lesson.id}-${lesson.status}-${lesson.paid}`} {...props} />;
}

function LessonRowInner({
  lesson,
  showDate = false,
  showStudent = true,
}: {
  lesson: Lesson;
  showDate?: boolean;
  showStudent?: boolean;
}) {
  const { students, prefs, editLesson } = useEditors();
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Partial<Lesson>>({});
  const l = { ...lesson, ...optimistic };
  const student = students.find((s) => s.id === l.studentId);
  const end = minutesToTime(timeToMinutes(l.startTime) + l.durationMinutes);
  const charged = STATUS_META[l.status].charged;

  async function patch(data: Partial<Pick<Lesson, 'status' | 'paid'>>, message: string) {
    setOptimistic((o) => ({ ...o, ...data }));
    try {
      await api(`/api/lessons/${lesson.id}`, 'PATCH', data);
      toast(message);
      startTransition(() => router.refresh());
    } catch (err) {
      setOptimistic({});
      toast((err as Error).message, 'error');
    }
  }

  const mark = (status: LessonStatus) => patch({ status }, `Marked ${STATUS_META[status].short.toLowerCase()}`);

  return (
    <div className="group flex items-center gap-3 rounded-box px-3 py-3 transition hover:bg-base-200/70">
      <button
        type="button"
        onClick={() => editLesson(lesson)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className={`h-10 w-1 shrink-0 rounded-full ${colorOf(student?.color ?? 'violet').bg}`} />
        <span className="w-14 shrink-0 tabular">
          <span className="block text-sm font-semibold">{l.startTime}</span>
          <span className="block text-xs text-base-content/50">{end}</span>
        </span>
        {showStudent && student && <Avatar name={student.name} color={student.color} size="sm" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {showStudent ? (student?.name ?? 'Unknown') : (l.topic ?? 'Lesson')}
          </span>
          <span className="block truncate text-xs text-base-content/55">
            {showDate && `${shortDay(l.date)} · `}
            {l.durationMinutes} min · {formatMoney(l.priceCents, prefs.currency)}
            {showStudent && l.topic && ` · ${l.topic}`}
          </span>
        </span>
      </button>

      {l.status === 'scheduled' ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => mark('attended')}
            className="btn btn-sm btn-circle btn-success btn-soft"
            aria-label="Mark present"
            title="Present"
          >
            <Check className="size-4" />
          </button>
          <button
            onClick={() => mark('no_show')}
            className="btn btn-sm btn-circle btn-error btn-soft"
            aria-label="Mark no-show"
            title="No-show (charged)"
          >
            <UserX className="size-4" />
          </button>
          <button
            onClick={() => mark('excused')}
            className="btn btn-sm btn-circle btn-warning btn-soft hidden sm:inline-flex"
            aria-label="Mark excused"
            title="Excused (not charged)"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          {/* On phones a charged lesson shows just its paid toggle, to keep the row narrow. */}
          <span className={charged ? 'hidden sm:contents' : 'contents'}>
            <StatusBadge status={l.status} />
          </span>
          {charged && (
            <button
              onClick={() => patch({ paid: !l.paid }, l.paid ? 'Marked unpaid' : 'Marked paid 💸')}
              className={`btn btn-xs rounded-full ${l.paid ? 'btn-success btn-soft' : 'btn-ghost border-base-300'}`}
              title={l.paid ? 'Paid — tap to undo' : 'Mark as paid'}
              aria-label={l.paid ? 'Paid — tap to undo' : 'Mark as paid'}
            >
              <CircleDollarSign className="size-3.5" />
              <span className="hidden sm:inline">{l.paid ? 'Paid' : 'Unpaid'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
