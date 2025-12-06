import { Router, Request, Response } from "express";
import { eq, desc, sql, and, like } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import {
  users,
  courses,
  courseEnrollments,
  courseDiscussions,
  discussionReplies,
  discussionUpvotes,
  courseMilestones,
  studentCourses,
  teacherContent,
  teacherContentChunks,
  aiChatSessions,
  notifications,
  badges,
  userBadges,
  insertCourseSchema,
  insertCourseDiscussionSchema,
  insertDiscussionReplySchema,
  insertStudentCourseSchema,
} from "@shared/schema";

const router = Router();

/**
 * Check and award course-related badges to a student based on their activity in a course
 * Milestone types:
 * - first_discussion: Posted first discussion in a course
 * - five_helpful_answers: Provided 5 answers with 3+ upvotes each
 * - resolved_three_questions: Helped resolve 3 questions
 * - active_contributor: 10+ discussions or replies in a course
 */
async function checkAndAwardCourseBadges(userId: string, courseId: string) {
  try {
    const courseBadgeTypes = {
      first_discussion: "Discussion Starter",
      five_helpful_answers: "Helpful Contributor",
      resolved_three_questions: "Problem Solver",
      active_contributor: "Active Learner",
    };

    // Check milestone: first_discussion
    const [discussionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(courseDiscussions)
      .where(and(
        eq(courseDiscussions.authorId, userId),
        eq(courseDiscussions.courseId, courseId)
      ));
    
    if (Number(discussionCount.count) === 1) {
      await db.insert(courseMilestones).values({
        studentId: userId,
        courseId,
        milestoneType: 'first_discussion',
      }).onConflictDoNothing();

      const [badgeData] = await db.select().from(badges).where(eq(badges.name, courseBadgeTypes.first_discussion)).limit(1);
      if (badgeData) {
        await db.insert(userBadges).values({
          userId,
          badgeId: badgeData.id,
        }).onConflictDoNothing();

        await db.insert(notifications).values({
          userId,
          type: 'badge_earned',
          title: 'New Badge Earned!',
          message: `You earned the "${badgeData.name}" badge for posting your first discussion!`,
          link: `/profile?userId=${userId}`,
        }).onConflictDoNothing();
      }
    }

    // Check milestone: five_helpful_answers (replies with 3+ upvotes)
    const [helpfulRepliesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(discussionReplies)
      .innerJoin(courseDiscussions, eq(discussionReplies.discussionId, courseDiscussions.id))
      .where(and(
        eq(discussionReplies.authorId, userId),
        eq(courseDiscussions.courseId, courseId),
        sql`${discussionReplies.upvoteCount} >= 3`
      ));
    
    if (Number(helpfulRepliesResult.count) >= 5) {
      const [existingMilestone] = await db
        .select()
        .from(courseMilestones)
        .where(and(
          eq(courseMilestones.studentId, userId),
          eq(courseMilestones.courseId, courseId),
          eq(courseMilestones.milestoneType, 'five_helpful_answers')
        ));
      
      if (!existingMilestone) {
        await db.insert(courseMilestones).values({
          studentId: userId,
          courseId,
          milestoneType: 'five_helpful_answers',
        }).onConflictDoNothing();

        const [badgeData] = await db.select().from(badges).where(eq(badges.name, courseBadgeTypes.five_helpful_answers)).limit(1);
        if (badgeData) {
          await db.insert(userBadges).values({
            userId,
            badgeId: badgeData.id,
          }).onConflictDoNothing();

          await db.insert(notifications).values({
            userId,
            type: 'badge_earned',
            title: 'New Badge Earned!',
            message: `You earned the "${badgeData.name}" badge for providing 5 helpful answers!`,
            link: `/profile?userId=${userId}`,
          }).onConflictDoNothing();
        }
      }
    }

    // Check milestone: resolved_three_questions
    const [resolvedQuestionsResult] = await db
      .select({ count: sql<number>`count(distinct ${courseDiscussions.id})` })
      .from(discussionReplies)
      .innerJoin(courseDiscussions, eq(discussionReplies.discussionId, courseDiscussions.id))
      .where(and(
        eq(discussionReplies.authorId, userId),
        eq(courseDiscussions.courseId, courseId),
        eq(courseDiscussions.isResolved, true)
      ));
    
    if (Number(resolvedQuestionsResult.count) >= 3) {
      const [existingMilestone] = await db
        .select()
        .from(courseMilestones)
        .where(and(
          eq(courseMilestones.studentId, userId),
          eq(courseMilestones.courseId, courseId),
          eq(courseMilestones.milestoneType, 'resolved_three_questions')
        ));
      
      if (!existingMilestone) {
        await db.insert(courseMilestones).values({
          studentId: userId,
          courseId,
          milestoneType: 'resolved_three_questions',
        }).onConflictDoNothing();

        const [badgeData] = await db.select().from(badges).where(eq(badges.name, courseBadgeTypes.resolved_three_questions)).limit(1);
        if (badgeData) {
          await db.insert(userBadges).values({
            userId,
            badgeId: badgeData.id,
          }).onConflictDoNothing();

          await db.insert(notifications).values({
            userId,
            type: 'badge_earned',
            title: 'New Badge Earned!',
            message: `You earned the "${badgeData.name}" badge for helping resolve 3 questions!`,
            link: `/profile?userId=${userId}`,
          }).onConflictDoNothing();
        }
      }
    }

    // Check milestone: active_contributor (10+ discussions/replies)
    const discussionsAndRepliesResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM (
        SELECT id FROM ${courseDiscussions} WHERE ${courseDiscussions.authorId} = ${userId} AND ${courseDiscussions.courseId} = ${courseId}
        UNION ALL
        SELECT ${discussionReplies.id} FROM ${discussionReplies}
        INNER JOIN ${courseDiscussions} ON ${discussionReplies.discussionId} = ${courseDiscussions.id}
        WHERE ${discussionReplies.authorId} = ${userId} AND ${courseDiscussions.courseId} = ${courseId}
      ) as combined
    `);
    
    const totalActivity = Number((discussionsAndRepliesResult.rows[0] as any)?.count || 0);
    
    if (totalActivity >= 10) {
      const [existingMilestone] = await db
        .select()
        .from(courseMilestones)
        .where(and(
          eq(courseMilestones.studentId, userId),
          eq(courseMilestones.courseId, courseId),
          eq(courseMilestones.milestoneType, 'active_contributor')
        ));
      
      if (!existingMilestone) {
        await db.insert(courseMilestones).values({
          studentId: userId,
          courseId,
          milestoneType: 'active_contributor',
        }).onConflictDoNothing();

        const [badgeData] = await db.select().from(badges).where(eq(badges.name, courseBadgeTypes.active_contributor)).limit(1);
        if (badgeData) {
          await db.insert(userBadges).values({
            userId,
            badgeId: badgeData.id,
          }).onConflictDoNothing();

          await db.insert(notifications).values({
            userId,
            type: 'badge_earned',
            title: 'New Badge Earned!',
            message: `You earned the "${badgeData.name}" badge for being an active contributor!`,
            link: `/profile?userId=${userId}`,
          }).onConflictDoNothing();
        }
      }
    }
  } catch (error) {
    console.error('Error checking course badges:', error);
  }
}

// ========================================================================
// STUDENT COURSES ENDPOINTS (Profile courses with teacher validation)
// ========================================================================

// Get student courses for a user
router.get("/users/:userId/student-courses", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

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

    const formattedCourses = coursesResult.map(({ course, validator }) => ({
      ...course,
      validator: validator?.id ? validator : null,
    }));

    res.json(formattedCourses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add a student course
router.post("/student-courses", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validated = insertStudentCourseSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    const [course] = await db
      .insert(studentCourses)
      .values(validated)
      .returning();

    res.json(course);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update a student course
router.patch("/student-courses/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(studentCourses)
      .where(eq(studentCourses.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update this course" });
    }

    const { isValidated, validatedBy, validatedAt, validationNote, ...updateData } = req.body;

    const [updated] = await db
      .update(studentCourses)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(studentCourses.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete a student course
router.delete("/student-courses/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(studentCourses)
      .where(eq(studentCourses.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this course" });
    }

    await db
      .delete(studentCourses)
      .where(eq(studentCourses.id, id));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Validate a student course (teachers only) - with auto-enrollment
router.post("/student-courses/:id/validate", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: "Only teachers can validate courses" });
  }

  try {
    const { id } = req.params;
    const { validationNote } = req.body;

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
      .where(eq(studentCourses.id, id))
      .limit(1);

    if (!courseData) {
      return res.status(404).json({ error: "Course not found" });
    }

    const { course, student } = courseData;

    if (course.assignedTeacherId && course.assignedTeacherId !== req.user.id) {
      return res.status(403).json({ 
        error: "Only the assigned teacher can validate this course" 
      });
    }

    const teacherUniversity = req.user.university;
    const studentUniversity = student.university;
    
    if (!teacherUniversity || !studentUniversity || teacherUniversity !== studentUniversity) {
      return res.status(403).json({ 
        error: "Teacher and student must belong to the same institution to validate courses" 
      });
    }

    const [validated] = await db
      .update(studentCourses)
      .set({
        isValidated: true,
        validationStatus: 'validated',
        validatedBy: req.user.id,
        validatedAt: new Date(),
        validationNote: validationNote || null,
        isEnrolled: true,
        enrolledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentCourses.id, id))
      .returning();

    if (course.courseId) {
      const [existingEnrollment] = await db
        .select()
        .from(courseEnrollments)
        .where(and(
          eq(courseEnrollments.courseId, course.courseId),
          eq(courseEnrollments.studentId, student.id)
        ))
        .limit(1);

      if (!existingEnrollment) {
        await db.insert(courseEnrollments).values({
          courseId: course.courseId,
          studentId: student.id,
        });
      }
    }

    res.json(validated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove validation from a student course
router.delete("/student-courses/:id/validation", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { id } = req.params;

    const [course] = await db
      .select()
      .from(studentCourses)
      .where(eq(studentCourses.id, id))
      .limit(1);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const canRemove = course.validatedBy === req.user.id || course.userId === req.user.id;
    if (!canRemove) {
      return res.status(403).json({ error: "Not authorized to remove validation" });
    }

    const [updated] = await db
      .update(studentCourses)
      .set({
        isValidated: false,
        validationStatus: 'pending',
        validatedBy: null,
        validatedAt: null,
        validationNote: null,
        isEnrolled: false,
        enrolledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(studentCourses.id, id))
      .returning();

    if (course.courseId) {
      await db
        .delete(courseEnrollments)
        .where(and(
          eq(courseEnrollments.courseId, course.courseId),
          eq(courseEnrollments.studentId, course.userId)
        ));
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get validated/enrolled courses for the current student (for Ask-Teacher AI access)
router.get("/me/enrolled-courses", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
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
      .where(and(
        eq(studentCourses.userId, req.user.id),
        eq(studentCourses.isValidated, true),
        eq(studentCourses.isEnrolled, true)
      ))
      .orderBy(desc(studentCourses.enrolledAt));

    const formattedCourses = await Promise.all(enrolledCourses.map(async ({ studentCourse, course, teacher }) => {
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
    }));

    res.json(formattedCourses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all courses assigned to a teacher
router.get("/teacher/courses", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: "Only teachers can view their assigned courses" });
  }

  try {
    const teacherCourses = await db
      .select({
        course: studentCourses,
        student: {
          id: users.id,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          university: users.university,
        },
      })
      .from(studentCourses)
      .innerJoin(users, eq(studentCourses.userId, users.id))
      .where(eq(studentCourses.assignedTeacherId, req.user.id))
      .orderBy(desc(studentCourses.createdAt));

    const teacherUniversity = req.user.university;
    const formatted = teacherCourses.map(({ course, student }) => ({
      ...course,
      student,
      canValidate: !course.isValidated && 
                   teacherUniversity && 
                   student.university === teacherUniversity,
      validationBlockedReason: !teacherUniversity ? "Teacher has no institution set" :
                               !student.university ? "Student has no institution set" :
                               student.university !== teacherUniversity ? "Different institutions" : null,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending validations for a teacher (only same institution)
router.get("/teacher/pending-validations", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: "Only teachers can view pending validations" });
  }

  try {
    const teacherUniversity = req.user.university;
    
    const pending = await db
      .select({
        course: studentCourses,
        student: {
          id: users.id,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          university: users.university,
        },
      })
      .from(studentCourses)
      .innerJoin(users, eq(studentCourses.userId, users.id))
      .where(and(
        eq(studentCourses.assignedTeacherId, req.user.id),
        eq(studentCourses.isValidated, false)
      ))
      .orderBy(desc(studentCourses.createdAt));

    const filtered = pending.filter(({ student }) => 
      teacherUniversity && student.university === teacherUniversity
    );

    res.json(filtered.map(({ course, student }) => ({ ...course, student })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
// COURSE FORUMS & DISCUSSIONS ENDPOINTS
// ========================================================================

// Get all courses
router.get("/courses", async (req: Request, res: Response) => {
  try {
    const allCourses = await storage.getCourses();
    res.json(allCourses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get courses created by a teacher
router.get("/me/created-courses", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'teacher' && req.user.role !== 'master_admin') {
    return res.status(403).json({ error: "Only teachers can view created courses" });
  }

  try {
    const createdCoursesData = await db
      .select()
      .from(courses)
      .where(eq(courses.instructorId, req.user.id))
      .orderBy(desc(courses.createdAt));

    const coursesWithStats = await Promise.all(
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

    res.json(coursesWithStats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new course (teachers only)
router.post("/courses", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: "Only teachers can create courses" });
  }

  try {
    const courseValidation = insertCourseSchema.safeParse({
      ...req.body,
      instructorId: req.user.id,
    });

    if (!courseValidation.success) {
      return res.status(400).json({ 
        error: "Invalid course data",
        details: courseValidation.error.errors 
      });
    }

    const { name, code, description, university, semester } = courseValidation.data;

    if (!name || !code) {
      return res.status(400).json({ error: "Course name and code are required" });
    }

    const existingCourse = await db
      .select()
      .from(courses)
      .where(eq(courses.code, code))
      .limit(1);

    if (existingCourse.length > 0) {
      return res.status(400).json({ error: "A course with this code already exists" });
    }

    const [newCourse] = await db
      .insert(courses)
      .values({
        name,
        code,
        description: description || null,
        university: university || req.user.university || null,
        instructorId: req.user.id,
        semester: semester || null,
      })
      .returning();

    res.json(newCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a course (teacher who created it only)
router.patch("/courses/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const courseId = req.params.id;
    
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (existingCourse.instructorId !== req.user.id && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Not authorized to update this course" });
    }

    const { name, code, description, semester } = req.body;

    const [updatedCourse] = await db
      .update(courses)
      .set({
        ...(name && { name }),
        ...(code && { code }),
        ...(description !== undefined && { description }),
        ...(semester !== undefined && { semester }),
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    res.json(updatedCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a course (teacher who created it only, including validated courses)
router.delete("/courses/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  const courseId = req.params.id;
  
  try {
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (existingCourse.instructorId !== req.user.id && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Not authorized to delete this course" });
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
          validationNote: `Course deleted on ${new Date().toISOString().split('T')[0]}`
        })
        .where(eq(studentCourses.courseId, courseId));

      await tx
        .delete(courses)
        .where(eq(courses.id, courseId));

      return { 
        deletedMaterialsCount: deletedMaterials.length,
        deletedSessionsCount: deletedSessions.length
      };
    });

    console.log(`Course ${courseId} (${existingCourse.name}) deleted by user ${req.user.id}. ` +
      `Validated: ${existingCourse.isUniversityValidated}. Materials removed: ${result.deletedMaterialsCount}`);

    res.json({ 
      success: true, 
      message: "Course and all related materials deleted successfully",
      deletedMaterialsCount: result.deletedMaterialsCount
    });
  } catch (error: any) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: error.message });
  }
});

// Request university validation for a course (teacher only)
router.post("/courses/:id/request-validation", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: "Only teachers can request course validation" });
  }

  try {
    const courseId = req.params.id;
    
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (existingCourse.instructorId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to request validation for this course" });
    }

    if (existingCourse.isUniversityValidated) {
      return res.status(400).json({ error: "Course is already validated by the university" });
    }

    if (!req.user.university) {
      return res.status(400).json({ error: "You must have a university set to request validation" });
    }

    const [updatedCourse] = await db
      .update(courses)
      .set({
        universityValidationStatus: 'pending',
        validationRequestedAt: new Date(),
        university: existingCourse.university || req.user.university,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    res.json(updatedCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending course validation requests for university admins
router.get("/university/pending-course-validations", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'university_admin' && req.user.role !== 'master_admin') {
    return res.status(403).json({ error: "Only university admins can view pending validations" });
  }

  try {
    const adminUniversity = req.user.university;
    
    if (!adminUniversity && req.user.role !== 'master_admin') {
      return res.status(400).json({ error: "University admin must have a university set" });
    }

    const pendingCourses = await db
      .select({
        course: courses,
        instructor: users,
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(
        and(
          eq(courses.universityValidationStatus, 'pending'),
          req.user.role === 'master_admin' ? undefined : eq(courses.university, adminUniversity!)
        )
      )
      .orderBy(desc(courses.validationRequestedAt));

    const result = pendingCourses.map(({ course, instructor }) => ({
      ...course,
      instructor: instructor ? {
        id: instructor.id,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        displayName: instructor.displayName,
        email: instructor.email,
        profileImageUrl: instructor.profileImageUrl,
        university: instructor.university,
      } : null,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve or reject course validation (university admin only)
router.post("/courses/:id/university-validation", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'university_admin' && req.user.role !== 'master_admin') {
    return res.status(403).json({ error: "Only university admins can validate courses" });
  }

  try {
    const courseId = req.params.id;
    const { action, note } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be 'approve' or 'reject'" });
    }
    
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!existingCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    if (req.user.role !== 'master_admin' && existingCourse.university !== req.user.university) {
      return res.status(403).json({ error: "Can only validate courses from your university" });
    }

    const isApproved = action === 'approve';

    const [updatedCourse] = await db
      .update(courses)
      .set({
        universityValidationStatus: isApproved ? 'validated' : 'rejected',
        isUniversityValidated: isApproved,
        validatedByUniversityAdminId: req.user.id,
        universityValidatedAt: new Date(),
        universityValidationNote: note || null,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    res.json(updatedCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get students from the same university (for teachers)
router.get("/teacher/my-students", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'teacher' && req.user.role !== 'master_admin') {
    return res.status(403).json({ error: "Only teachers can view their students" });
  }

  try {
    const enrolledStudents = await db
      .select({
        student: users,
        course: courses,
        enrolledAt: courseEnrollments.enrolledAt,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .innerJoin(users, eq(courseEnrollments.studentId, users.id))
      .where(eq(courses.instructorId, req.user.id))
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

    res.json(Array.from(studentMap.values()));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get teachers for a student (teachers of enrolled courses)
router.get("/student/my-teachers", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const teacherData = await db
      .select({
        teacher: users,
        course: courses,
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .innerJoin(users, eq(courses.instructorId, users.id))
      .where(eq(courseEnrollments.studentId, req.user.id))
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

    res.json(Array.from(teacherMap.values()));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get validated courses for a specific teacher
router.get("/teachers/:teacherId/validated-courses", async (req: Request, res: Response) => {
  try {
    const teacherId = req.params.teacherId;

    const validatedCoursesData = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.instructorId, teacherId),
        eq(courses.isUniversityValidated, true)
      ))
      .orderBy(desc(courses.universityValidatedAt));

    const coursesWithStats = await Promise.all(
      validatedCoursesData.map(async (course) => {
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

    res.json(coursesWithStats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed course information
router.get("/courses/:id", async (req: Request, res: Response) => {
  try {
    const courseId = req.params.id;
    
    const courseData = await db
      .select({
        course: courses,
        instructor: users,
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(eq(courses.id, courseId))
      .limit(1);
    
    if (courseData.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const enrolledStudentsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, courseId));
    
    const enrolledCount = Number(enrolledStudentsResult[0]?.count || 0);

    const topDiscussions = await db
      .select({
        discussion: courseDiscussions,
        author: users,
      })
      .from(courseDiscussions)
      .leftJoin(users, eq(courseDiscussions.authorId, users.id))
      .where(eq(courseDiscussions.courseId, courseId))
      .orderBy(desc(courseDiscussions.upvoteCount), desc(courseDiscussions.createdAt))
      .limit(5);

    res.json({
      ...courseData[0].course,
      instructor: courseData[0].instructor,
      enrolledCount,
      topDiscussions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get discussions for a course
router.get("/courses/:courseId/discussions", async (req: Request, res: Response) => {
  try {
    const discussionsData = await db
      .select({
        discussion: courseDiscussions,
        author: users,
      })
      .from(courseDiscussions)
      .leftJoin(users, eq(courseDiscussions.authorId, users.id))
      .where(eq(courseDiscussions.courseId, req.params.courseId))
      .orderBy(desc(courseDiscussions.upvoteCount), desc(courseDiscussions.createdAt))
      .limit(50);

    res.json(discussionsData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new discussion
router.post("/discussions", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validatedData = insertCourseDiscussionSchema.parse({
      ...req.body,
      authorId: req.user.id,
    });

    const newDiscussion = await storage.createDiscussion(validatedData);
    
    await db
      .update(users)
      .set({ engagementScore: sql`${users.engagementScore} + 5` })
      .where(eq(users.id, req.user.id));

    await checkAndAwardCourseBadges(req.user.id, validatedData.courseId);

    res.json(newDiscussion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get discussion replies
router.get("/discussions/:discussionId/replies", async (req: Request, res: Response) => {
  try {
    const repliesData = await db
      .select({
        reply: discussionReplies,
        author: users,
      })
      .from(discussionReplies)
      .leftJoin(users, eq(discussionReplies.authorId, users.id))
      .where(eq(discussionReplies.discussionId, req.params.discussionId))
      .orderBy(desc(discussionReplies.upvoteCount), desc(discussionReplies.createdAt))
      .limit(100);

    res.json(repliesData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a reply
router.post("/replies", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validatedData = insertDiscussionReplySchema.parse({
      ...req.body,
      authorId: req.user.id,
    });

    const newReply = await storage.createReply(validatedData);
    
    await db
      .update(users)
      .set({ engagementScore: sql`${users.engagementScore} + 3` })
      .where(eq(users.id, req.user.id));

    const [discussion] = await db
      .select()
      .from(courseDiscussions)
      .where(eq(courseDiscussions.id, validatedData.discussionId));

    if (discussion && discussion.authorId !== req.user.id) {
      await db.insert(notifications).values({
        userId: discussion.authorId,
        type: "comment",
        title: "New Reply",
        message: `${req.user.firstName} ${req.user.lastName} replied to your discussion`,
        link: `/forums/${discussion.courseId}/${discussion.id}`,
      });
    }

    if (discussion) {
      await checkAndAwardCourseBadges(req.user.id, discussion.courseId);
    }

    res.json(newReply);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Toggle upvote on discussion
router.post("/discussions/:discussionId/upvote", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const upvoted = await storage.toggleDiscussionUpvote(
      req.user.id,
      req.params.discussionId
    );

    res.json({ upvoted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle upvote on reply
router.post("/replies/:replyId/upvote", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const upvoted = await storage.toggleReplyUpvote(
      req.user.id,
      req.params.replyId
    );

    res.json({ upvoted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
