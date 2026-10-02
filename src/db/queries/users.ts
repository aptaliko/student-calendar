import { eq } from 'drizzle-orm';
import { db } from '../client';
import { users, type User } from '../schema';

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
  timezone: string;
}): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({ ...data, email: data.email.toLowerCase() })
    .returning();
  return user;
}

export async function updateUser(
  id: number,
  data: Partial<Pick<User, 'name' | 'currency' | 'defaultRateCents' | 'defaultDurationMinutes' | 'timezone'>>,
): Promise<User | undefined> {
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return user;
}
