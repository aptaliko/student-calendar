import { listLessons } from '@/db/queries/lessons';
import { listStudents } from '@/db/queries/students';
import { PageHeader } from '@/components/Card';
import { NewStudentButton } from '@/components/Actions';
import StudentsList from '@/components/StudentsList';
import { endOfMonth, startOfMonth, todayIn } from '@/lib/dates';
import { totalsByStudent } from '@/lib/reports';
import { requireUser } from '@/lib/session';

export const metadata = { title: 'Students' };

export default async function StudentsPage() {
  const user = await requireUser();
  const today = todayIn(user.timezone);
  const [students, lessons] = await Promise.all([listStudents(user.id), listLessons(user.id)]);

  const all = totalsByStudent(lessons);
  const thisMonth = totalsByStudent(lessons.filter((l) => l.date >= startOfMonth(today) && l.date <= endOfMonth(today)));
  const nextLesson = new Map<number, string>();
  for (const l of lessons) {
    if (l.date >= today && l.status === 'scheduled' && !nextLesson.has(l.studentId)) {
      nextLesson.set(l.studentId, `${l.date} ${l.startTime}`);
    }
  }

  const rows = students.map((s) => ({
    student: s,
    monthMinutes: thisMonth.get(s.id)?.attendedMinutes ?? 0,
    outstandingCents: all.get(s.id)?.outstandingCents ?? 0,
    attendanceRate: all.get(s.id)?.attendanceRate ?? null,
    next: nextLesson.get(s.id) ?? null,
  }));

  return (
    <div className="animate-rise">
      <PageHeader title="Students" subtitle={`${students.filter((s) => !s.archived).length} active students`}>
        <NewStudentButton />
      </PageHeader>
      <StudentsList rows={rows} />
    </div>
  );
}
