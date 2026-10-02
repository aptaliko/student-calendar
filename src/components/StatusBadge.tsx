import type { LessonStatus } from '@/db/schema';
import { STATUS_META } from '@/lib/lessons';

export default function StatusBadge({ status }: { status: LessonStatus }) {
  const m = STATUS_META[status];
  return <span className={`badge badge-sm badge-soft ${m.badge} whitespace-nowrap`}>{m.short}</span>;
}
