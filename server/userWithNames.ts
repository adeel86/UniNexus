import { eq, inArray, SQL } from "drizzle-orm";
import { db } from "./db";
import { users, universities, majors } from "@shared/schema";
import type { User } from "@shared/schema";

export const userWithNamesSelect = {
  id: users.id,
  firebaseUid: users.firebaseUid,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  displayName: users.displayName,
  profileImageUrl: users.profileImageUrl,
  role: users.role,
  bio: users.bio,
  universityId: users.universityId,
  majorId: users.majorId,
  graduationYear: users.graduationYear,
  interests: users.interests,
  emailVerified: users.emailVerified,
  verificationSentAt: users.verificationSentAt,
  isVerified: users.isVerified,
  verifiedAt: users.verifiedAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  university: universities.name,
  major: majors.name,
};

export async function getUserWithNames(whereClause: SQL): Promise<User | undefined> {
  const [result] = await db
    .select(userWithNamesSelect)
    .from(users)
    .leftJoin(universities, eq(users.universityId, universities.id))
    .leftJoin(majors, eq(users.majorId, majors.id))
    .where(whereClause)
    .limit(1);
  return result as User | undefined;
}

export async function getUsersWithNames(whereClause?: SQL, limit?: number): Promise<User[]> {
  let q = db
    .select(userWithNamesSelect)
    .from(users)
    .leftJoin(universities, eq(users.universityId, universities.id))
    .leftJoin(majors, eq(users.majorId, majors.id))
    .$dynamic();

  if (whereClause) q = q.where(whereClause);
  if (limit) q = q.limit(limit);

  const results = await q;
  return results as User[];
}

export async function buildUserNameMap(
  userIds: string[]
): Promise<Map<string, { university: string | null; major: string | null }>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: users.id,
      university: universities.name,
      major: majors.name,
    })
    .from(users)
    .leftJoin(universities, eq(users.universityId, universities.id))
    .leftJoin(majors, eq(users.majorId, majors.id))
    .where(inArray(users.id, userIds));
  return new Map(rows.map((r) => [r.id, { university: r.university, major: r.major }]));
}

export function enrichWithNames<T extends { id?: string | null }>(
  items: T[],
  nameMap: Map<string, { university: string | null; major: string | null }>
): (T & { university?: string | null; major?: string | null })[] {
  return items.map((item) => ({
    ...item,
    ...(item.id ? nameMap.get(item.id) : {}),
  }));
}
