import { and, asc, eq } from 'drizzle-orm';
import { db } from '../client';
import { students, type Student } from '../schema';

export type StudentInput = Pick<Student, 'name' | 'email' | 'phone' | 'color' | 'hourlyRateCents' | 'notes'>;

export async function listStudents(ownerId: number): Promise<Student[]> {
  return db.select().from(students).where(eq(students.ownerId, ownerId)).orderBy(asc(students.name));
}

export async function getStudent(ownerId: number, id: number): Promise<Student | undefined> {
  const [s] = await db
    .select()
    .from(students)
    .where(and(eq(students.ownerId, ownerId), eq(students.id, id)));
  return s;
}

export async function createStudent(ownerId: number, data: StudentInput): Promise<Student> {
  const [s] = await db
    .insert(students)
    .values({ ...data, ownerId })
    .returning();
  return s;
}

export async function updateStudent(
  ownerId: number,
  id: number,
  data: Partial<StudentInput & { archived: boolean }>,
): Promise<Student | undefined> {
  const [s] = await db
    .update(students)
    .set(data)
    .where(and(eq(students.ownerId, ownerId), eq(students.id, id)))
    .returning();
  return s;
}

export async function deleteStudent(ownerId: number, id: number): Promise<boolean> {
  const rows = await db
    .delete(students)
    .where(and(eq(students.ownerId, ownerId), eq(students.id, id)))
    .returning({ id: students.id });
  return rows.length > 0;
}
