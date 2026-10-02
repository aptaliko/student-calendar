'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Lesson, Student } from '@/db/schema';
import { STUDENT_COLOR_NAMES } from '@/lib/lessons';
import LessonDialog, { type LessonDefaults } from './LessonDialog';
import StudentDialog from './StudentDialog';

export type Prefs = {
  currency: string;
  defaultRateCents: number;
  defaultDurationMinutes: number;
  today: string;
};

type EditorsApi = {
  prefs: Prefs;
  students: Student[];
  newLesson: (defaults?: LessonDefaults) => void;
  editLesson: (lesson: Lesson) => void;
  newStudent: () => void;
  editStudent: (student: Student) => void;
};

const EditorsContext = createContext<EditorsApi | null>(null);

export function useEditors(): EditorsApi {
  const ctx = useContext(EditorsContext);
  if (!ctx) throw new Error('useEditors must be used inside <EditorsProvider>');
  return ctx;
}

/**
 * Hosts the lesson + student dialogs once for the whole signed-in app, so any page or
 * component can open them. Saving refreshes the current route's server data.
 */
export function EditorsProvider({
  prefs,
  students,
  children,
}: {
  prefs: Prefs;
  students: Student[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [lessonState, setLessonState] = useState<{ key: number; lesson?: Lesson; defaults?: LessonDefaults } | null>(
    null,
  );
  const [studentState, setStudentState] = useState<{ key: number; student?: Student } | null>(null);

  const newLesson = useCallback((defaults?: LessonDefaults) => setLessonState({ key: Date.now(), defaults }), []);
  const editLesson = useCallback((lesson: Lesson) => setLessonState({ key: Date.now(), lesson }), []);
  const newStudent = useCallback(() => setStudentState({ key: Date.now() }), []);
  const editStudent = useCallback((student: Student) => setStudentState({ key: Date.now(), student }), []);

  const saved = useCallback(() => router.refresh(), [router]);

  return (
    <EditorsContext.Provider value={{ prefs, students, newLesson, editLesson, newStudent, editStudent }}>
      {children}
      {lessonState && (
        <LessonDialog
          key={lessonState.key}
          lesson={lessonState.lesson}
          defaults={lessonState.defaults}
          students={students}
          prefs={prefs}
          onClose={() => setLessonState(null)}
          onSaved={saved}
          onAddStudent={() => {
            setLessonState(null);
            newStudent();
          }}
        />
      )}
      {studentState && (
        <StudentDialog
          key={studentState.key}
          student={studentState.student}
          prefs={prefs}
          suggestedColor={STUDENT_COLOR_NAMES[students.length % STUDENT_COLOR_NAMES.length]}
          onClose={() => setStudentState(null)}
          onSaved={saved}
        />
      )}
    </EditorsContext.Provider>
  );
}
