import { eq, desc, sql, and, like } from "drizzle-orm";
import { db } from "../db";
import {
  users,
  courses,
  courseEnrollments,
  courseDiscussions,
  studentCourses,
  teacherContent,
  teacherContentChunks,
  aiChatSessions,
  notifications,
} from "@shared/schema";

export async function getStudentCoursesForUser(userId: string) {
  const coursesResult = await db
    .select({
      course: studentCourses,
      validator: {
        id: users.id,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
      },
    })
    .from(studentCourses)
    .leftJoin(users, eq(studentCourses.validatedBy, users.id))
    .where(eq(studentCourses.userId, userId))
    .orderBy(desc(studentCourses.year), desc(studentCourses.createdAt));

  return coursesResult.map(({ course, validator }) => ({
    ...course,
    validator: validator?.id ? validator : null,
  }));
}

export async function getEnrolledCoursesForStudent(userId: string) {
  const enrolledCourses = await db
    .select({
      studentCourse: studentCourses,
      course: courses,
      teacher: {
        id: users.id,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
      },
    })
    .from(studentCourses)
    .leftJoin(courses, eq(studentCourses.courseId, courses.id))
    .leftJoin(users, eq(courses.instructorId, users.id))
    .where(
      and(
        eq(studentCourses.userId, userId),
        eq(studentCourses.isValidated, true),
        eq(studentCourses.isEnrolled, true)
      )
    )
    .orderBy(desc(studentCourses.enrolledAt));

  return Promise.all(
    enrolledCourses.map(async ({ studentCourse, course, teacher }) => {
      let materialCount = 0;
      if (course?.id) {
        const materials = await db
          .select({ count: sql<number>`count(*)` })
          .from(teacherContent)
          .where(eq(teacherContent.courseId, course.id));
        materialCount = materials[0]?.count || 0;
      }

      return {
        id: studentCourse.id,
        studentCourseId: studentCourse.id,
        courseId: course?.id || null,
        courseName: course?.name || studentCourse.courseName,
        courseCode: course?.code || studentCourse.courseCode,
        description: course?.description || studentCourse.description,
        institution: course?.university || studentCourse.institution,
        semester: course?.semester || studentCourse.semester,
        teacher: teacher || null,
        enrolledAt: studentCourse.enrolledAt,
        validatedAt: studentCourse.validatedAt,
        materialCount,
        hasAIAccess: !!course?.id && materialCount > 0,
      };
    })
  );
}

export async function validateStudentCourse(
  courseId: string,
  teacherId: string,
  teacherUniversity: string | null,
  validationNote?: string
) {
  const [courseData] = await db
    .select({
      course: studentCourses,
      student: {
        id: users.id,
        university: users.university,
      },
    })
    .from(studentCourses)
    .innerJoin(users, eq(studentCourses.userId, users.id))
    .where(eq(studentCourses.id, courseId))
    .limit(1);

  if (!courseData) {
    throw new Error("Course not found");
  }

  const { course, student } = courseData;

  if (course.assignedTeacherId && course.assignedTeacherId !== teacherId) {
    throw new Error("Only the assigned teacher can validate this course");
  }

  const studentUniversity = student.university;
  if (
    !teacherUniversity ||
    !studentUniversity ||
    teacherUniversity !== studentUniversity
  ) {
    throw new Error(
      "Teacher and student must belong to the same institution to validate courses"
    );
  }

  const [validated] = await db
    .update(studentCourses)
    .set({
      isValidated: true,
      validationStatus: "validated",
      validatedBy: teacherId,
      validatedAt: new Date(),
      validationNote: validationNote || null,
      isEnrolled: true,
      enrolledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(studentCourses.id, courseId))
    .returning();

  if (course.courseId) {
    const [existingEnrollment] = await db
      .select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, course.courseId),
          eq(courseEnrollments.studentId, student.id)
        )
      )
      .limit(1);

    if (!existingEnrollment) {
      await db.insert(courseEnrollments).values({
        courseId: course.courseId,
        studentId: student.id,
      });
    }
  }

  return validated;
}

export async function removeValidation(
  courseId: string,
  userId: string
): Promise<any> {
  const [course] = await db
    .select()
    .from(studentCourses)
    .where(eq(studentCourses.id, courseId))
    .limit(1);

  if (!course) {
    throw new Error("Course not found");
  }

  const canRemove = course.validatedBy === userId || course.userId === userId;
  if (!canRemove) {
    throw new Error("Not authorized to remove validation");
  }

  const [updated] = await db
    .update(studentCourses)
    .set({
      isValidated: false,
      validationStatus: "pending",
      validatedBy: null,
      validatedAt: null,
      validationNote: null,
      isEnrolled: false,
      enrolledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(studentCourses.id, courseId))
    .returning();

  if (course.courseId) {
    await db
      .delete(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, course.courseId),
          eq(courseEnrollments.studentId, course.userId)
        )
      );
  }

  return updated;
}

export async function getCoursesWithStats(instructorId: string) {
  const createdCoursesData = await db
    .select()
    .from(courses)
    .where(eq(courses.instructorId, instructorId))
    .orderBy(desc(courses.createdAt));

  return Promise.all(
    createdCoursesData.map(async (course) => {
      const discussionCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(courseDiscussions)
        .where(eq(courseDiscussions.courseId, course.id));

      const enrollmentCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(courseEnrollments)
        .where(eq(courseEnrollments.courseId, course.id));

      return {
        ...course,
        discussionCount: Number(discussionCountResult[0]?.count || 0),
        enrollmentCount: Number(enrollmentCountResult[0]?.count || 0),
      };
    })
  );
}

export async function deleteCourseWithRelatedData(
  courseId: string,
  userId: string,
  userRole: string
) {
  const [existingCourse] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!existingCourse) {
    throw new Error("Course not found");
  }

  if (existingCourse.instructorId !== userId && userRole !== "master_admin") {
    throw new Error("Not authorized to delete this course");
  }

  const result = await db.transaction(async (tx) => {
    const deletedSessions = await tx
      .delete(aiChatSessions)
      .where(eq(aiChatSessions.courseId, courseId))
      .returning();

    await tx
      .delete(teacherContentChunks)
      .where(eq(teacherContentChunks.courseId, courseId));

    const deletedMaterials = await tx
      .delete(teacherContent)
      .where(eq(teacherContent.courseId, courseId))
      .returning();

    await tx
      .delete(notifications)
      .where(like(notifications.link, `%/courses/${courseId}%`));

    await tx
      .update(studentCourses)
      .set({
        courseId: null,
        validationNote: `Course deleted on ${new Date().toISOString().split("T")[0]}`,
      })
      .where(eq(studentCourses.courseId, courseId));

    await tx.delete(courses).where(eq(courses.id, courseId));

    return {
      deletedMaterialsCount: deletedMaterials.length,
      deletedSessionsCount: deletedSessions.length,
    };
  });

  console.log(
    `Course ${courseId} (${existingCourse.name}) deleted by user ${userId}. ` +
      `Validated: ${existingCourse.isUniversityValidated}. Materials removed: ${result.deletedMaterialsCount}`
  );

  return result;
}

export async function getTeacherStudents(teacherId: string) {
  const enrolledStudents = await db
    .select({
      student: users,
      course: courses,
      enrolledAt: courseEnrollments.enrolledAt,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .innerJoin(users, eq(courseEnrollments.studentId, users.id))
    .where(eq(courses.instructorId, teacherId))
    .orderBy(users.firstName, users.lastName);

  const studentMap = new Map<string, any>();
  for (const row of enrolledStudents) {
    if (!studentMap.has(row.student.id)) {
      studentMap.set(row.student.id, {
        ...row.student,
        courses: [],
      });
    }
    studentMap.get(row.student.id).courses.push({
      id: row.course.id,
      name: row.course.name,
      code: row.course.code,
      enrolledAt: row.enrolledAt,
    });
  }

  return Array.from(studentMap.values());
}

export async function getStudentTeachers(studentId: string) {
  const teacherData = await db
    .select({
      teacher: users,
      course: courses,
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .innerJoin(users, eq(courses.instructorId, users.id))
    .where(eq(courseEnrollments.studentId, studentId))
    .orderBy(users.firstName, users.lastName);

  const teacherMap = new Map<string, any>();
  for (const row of teacherData) {
    if (!teacherMap.has(row.teacher.id)) {
      teacherMap.set(row.teacher.id, {
        id: row.teacher.id,
        firstName: row.teacher.firstName,
        lastName: row.teacher.lastName,
        displayName: row.teacher.displayName,
        email: row.teacher.email,
        profileImageUrl: row.teacher.profileImageUrl,
        university: row.teacher.university,
        bio: row.teacher.bio,
        courses: [],
      });
    }
    teacherMap.get(row.teacher.id).courses.push({
      id: row.course.id,
      name: row.course.name,
      code: row.course.code,
    });
  }

  return Array.from(teacherMap.values());
}
