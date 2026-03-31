import { Router, Request, Response } from "express";
import { eq, desc, sql, and, ilike, or } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
import { updateTotalPointsAfterScoreChange } from "../pointsHelper";
import {
  users,
  universities,
  majors,
  courses,
  courseEnrollments,
  courseDiscussions,
  discussionReplies,
  studentCourses,
  notifications,
  insertCourseSchema,
  insertCourseDiscussionSchema,
  insertDiscussionReplySchema,
} from "@shared/schema";
import {
  checkAndAwardCourseBadges,
  getEnrolledCoursesForStudent,
  validateStudentCourse,
  removeValidation,
  getCoursesWithStats,
  deleteCourseWithRelatedData,
  getTeacherStudents,
  getStudentTeachers,
  getCourseDetails,
  getCourseDiscussions,
  getDiscussionReplies,
  getDiscussionById,
} from "../services";
import { updateUserStreakForActivity } from "../streakHelper";

const router = Router();

// ========================================================================
// UNIVERSITY ENDPOINTS
// ========================================================================

router.get("/universities", async (_req: Request, res: Response) => {
  try {
    const allUniversities = await db.select().from(universities).orderBy(universities.name);
    res.json(allUniversities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search universities by name (for autocomplete)
router.get("/universities/search", async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    
    if (!query) {
      return res.json([]);
    }

    // Search using case-insensitive LIKE
    const searchResults = await db
      .select()
      .from(universities)
      .where(ilike(universities.name, `%${query}%`))
      .orderBy(universities.name)
      .limit(10);

    res.json(searchResults);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create or get university (allow unauthenticated for registration)
router.post("/universities", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: "University name is required" });
    }

    const university = await storage.getOrCreateUniversity(name);
    res.json(university);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search majors by name (for autocomplete)
router.get("/majors/search", async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    
    if (!query) {
      return res.json([]);
    }

    // Search using case-insensitive LIKE
    const searchResults = await db
      .select()
      .from(majors)
      .where(ilike(majors.name, `%${query}%`))
      .orderBy(majors.name)
      .limit(15);

    res.json(searchResults);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create or get major (allow unauthenticated for registration)
router.post("/majors", async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: "Major name is required" });
    }

    const major = await storage.getOrCreateMajor(name, category);
    res.json(major);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});



router.get("/majors", async (_req: Request, res: Response) => {
  try {
    const allMajors = await db.select().from(majors).orderBy(majors.name);
    res.json(allMajors);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
// STUDENT COURSES VALIDATION ENDPOINTS (CRUD is handled in users.ts)
// ========================================================================

router.post("/student-courses/:id/validate", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Only teachers can validate courses" });

  try {
    const { action, validationNote } = req.body; // 'approve' or 'reject'
    
    if (action === 'reject') {
      const [updated] = await db.update(studentCourses)
        .set({ 
          validationStatus: 'rejected',
          isValidated: false,
          validationNote: validationNote || null,
          updatedAt: new Date() 
        })
        .where(eq(studentCourses.id, req.params.id))
        .returning();
        
      await db.insert(notifications).values({
        userId: updated.userId,
        type: "validation",
        title: "Course Validation Rejected",
        message: `Your course "${updated.courseName}" validation was rejected by the teacher.`,
        link: "/profile",
      });
      
      return res.json(updated);
    }

    // Validate course (when action is 'approve' or no action specified)
    const validated = await validateStudentCourse(
      req.params.id,
      req.user.id,
      req.user.university ?? null,
      validationNote
    );
    res.json(validated);
  } catch (error: any) {
    const status = error.message.includes("not found") ? 404 : error.message.includes("authorized") ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.delete("/student-courses/:id/validation", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const updated = await removeValidation(req.params.id, req.user.id);
    res.json(updated);
  } catch (error: any) {
    const status = error.message.includes("not found") ? 404 : error.message.includes("authorized") ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.get("/me/enrolled-courses", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const courses = await getEnrolledCoursesForStudent(req.user.id);
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/teacher/courses", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Only teachers can view their assigned courses" });

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

    const formatted = teacherCourses.map(({ course, student }) => ({
      ...course,
      student,
      canValidate: !course.isValidated,
      validationBlockedReason: null,
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/teacher/pending-validations", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Only teachers can view pending validations" });

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
          major: users.major,
          graduationYear: users.graduationYear,
        },
      })
      .from(studentCourses)
      .innerJoin(users, eq(studentCourses.userId, users.id))
      .where(and(
        eq(studentCourses.assignedTeacherId, req.user.id), 
        eq(studentCourses.isValidated, false),
        eq(studentCourses.validationStatus, 'pending')
      ))
      .orderBy(desc(studentCourses.createdAt));

    res.json(pending.map(({ course, student }) => ({ ...course, student })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
// COURSE ENROLLMENT
// ========================================================================

router.post("/courses/:id/enroll", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;
    
    await storage.createEnrollment(id, user.id);
    
    // Track streak for course enrollment
    await updateUserStreakForActivity(user.id, 'COURSE_ENROLLMENT').catch((error) => {
      console.error('Failed to update streak for course enrollment:', error);
    });
    
    // Fetch updated course to return the new enrollment count
    const updatedCourse = await storage.getCourse(id);
    res.json(updatedCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========================================================================
// COURSE FORUMS & DISCUSSIONS ENDPOINTS
// ========================================================================

router.get("/courses", async (_req: Request, res: Response) => {
  try {
    const allCourses = await storage.getCourses();
    res.json(allCourses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/me/created-courses", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  if (req.user.role !== "teacher" && req.user.role !== "master_admin") {
    return res.status(403).json({ error: "Only teachers can view created courses" });
  }

  try {
    const instructorId = req.user.id;
    const university = req.user.university;

    // Teachers only see their own courses. University admins/Master admins might see more.
    const createdCoursesData = await db
      .select()
      .from(courses)
      .where(
        req.user.role === "master_admin" 
          ? undefined 
          : and(
              eq(courses.instructorId, instructorId),
              university ? eq(courses.university, university) : undefined
            )
      )
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

router.post("/courses", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  if (req.user.role !== "teacher" && req.user.role !== "master_admin") return res.status(403).json({ error: "Only teachers can create courses" });

  try {
    const courseValidation = insertCourseSchema.safeParse({ ...req.body, instructorId: req.user.id });
    if (!courseValidation.success) {
      return res.status(400).json({ error: "Invalid course data", details: courseValidation.error.errors });
    }

    const { name, code, description, university, semester } = courseValidation.data;
    if (!name || !code) return res.status(400).json({ error: "Course name and code are required" });

    const existingCourse = await db.select().from(courses).where(eq(courses.code, code)).limit(1);
    if (existingCourse.length > 0) return res.status(400).json({ error: "A course with this code already exists" });

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
    
    // Track streak for course creation
    await updateUserStreakForActivity(req.user.id, 'COURSE_CREATION').catch((error) => {
      console.error('Failed to update streak for course creation:', error);
    });
    
    res.json(newCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/courses/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const courseId = req.params.id;
    const [existingCourse] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!existingCourse) return res.status(404).json({ error: "Course not found" });
    if (existingCourse.instructorId !== req.user.id && req.user.role !== "master_admin") {
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

router.delete("/courses/:id", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const result = await deleteCourseWithRelatedData(req.params.id, req.user.id, req.user.role || "");
    res.json({ success: true, message: "Course and all related materials deleted successfully", deletedMaterialsCount: result.deletedMaterialsCount });
  } catch (error: any) {
    const status = error.message.includes("not found") ? 404 : error.message.includes("authorized") ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.post("/courses/:id/request-validation", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  if (req.user.role !== "teacher") return res.status(403).json({ error: "Only teachers can request course validation" });

  try {
    const courseId = req.params.id;
    const [existingCourse] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!existingCourse) return res.status(404).json({ error: "Course not found" });
    if (existingCourse.instructorId !== req.user.id) return res.status(403).json({ error: "Not authorized to request validation for this course" });
    if (existingCourse.isUniversityValidated) return res.status(400).json({ error: "Course is already validated by the university" });
    if (!req.user.university) return res.status(400).json({ error: "You must have a university set to request validation" });

    const [updatedCourse] = await db
      .update(courses)
      .set({
        universityValidationStatus: "pending",
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

router.get("/university/pending-course-validations", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  if (req.user.role !== "university_admin" && req.user.role !== "master_admin") {
    return res.status(403).json({ error: "Only university admins can view pending validations" });
  }

  try {
    const adminUniversity = req.user.university;
    if (!adminUniversity && req.user.role !== "master_admin") {
      return res.status(400).json({ error: "University admin must have a university set" });
    }

    const pendingCourses = await db
      .select({ course: courses, instructor: users })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(and(eq(courses.universityValidationStatus, "pending"), req.user.role === "master_admin" ? undefined : eq(courses.university, adminUniversity!)))
      .orderBy(desc(courses.validationRequestedAt));

    const result = pendingCourses.map(({ course, instructor }) => ({
      ...course,
      instructor: instructor
        ? { id: instructor.id, firstName: instructor.firstName, lastName: instructor.lastName, displayName: instructor.displayName, email: instructor.email, profileImageUrl: instructor.profileImageUrl, university: instructor.university }
        : null,
    }));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/courses/:id/university-validation", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  if (req.user.role !== "university_admin" && req.user.role !== "master_admin") {
    return res.status(403).json({ error: "Only university admins can validate courses" });
  }

  try {
    const courseId = req.params.id;
    const { action, note } = req.body;
    if (!["approve", "reject"].includes(action)) return res.status(400).json({ error: "Invalid action. Must be 'approve' or 'reject'" });

    const [existingCourse] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!existingCourse) return res.status(404).json({ error: "Course not found" });
    
    // Check if admin belongs to the same university
    if (req.user.role !== "master_admin" && existingCourse.university !== req.user.university) {
      return res.status(403).json({ error: "Can only validate courses from your university" });
    }

    const isApproved = action === "approve";
    const [updatedCourse] = await db
      .update(courses)
      .set({
        universityValidationStatus: isApproved ? "validated" : "rejected",
        isUniversityValidated: isApproved,
        validatedByUniversityAdminId: req.user.id,
        universityValidatedAt: new Date(),
        universityValidationNote: note || null,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    // Notify the teacher
    if (existingCourse.instructorId) {
      await db.insert(notifications).values({
        userId: existingCourse.instructorId,
        type: "validation",
        title: isApproved ? "Course Approved!" : "Course Rejected",
        message: `Your course "${existingCourse.name}" was ${isApproved ? 'approved' : 'rejected'} by the university.`,
        link: "/dashboard",
      });
    }

    res.json(updatedCourse);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/teacher/my-students", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  if (req.user.role !== "teacher" && req.user.role !== "master_admin") {
    return res.status(403).json({ error: "Only teachers can view their students" });
  }

  try {
    const students = await getTeacherStudents(req.user.id);
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/student/my-teachers", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const teachers = await getStudentTeachers(req.user.id);
    res.json(teachers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/teachers/:teacherId/validated-courses", async (req: Request, res: Response) => {
  try {
    const teacherId = req.params.teacherId;
    const validatedCoursesData = await db
      .select()
      .from(courses)
      .where(and(eq(courses.instructorId, teacherId), eq(courses.isUniversityValidated, true)))
      .orderBy(desc(courses.universityValidatedAt));

    const coursesWithStats = await Promise.all(
      validatedCoursesData.map(async (course) => {
        const discussionCountResult = await db.select({ count: sql<number>`count(*)` }).from(courseDiscussions).where(eq(courseDiscussions.courseId, course.id));
        const enrollmentCountResult = await db.select({ count: sql<number>`count(*)` }).from(courseEnrollments).where(eq(courseEnrollments.courseId, course.id));
        return { ...course, discussionCount: Number(discussionCountResult[0]?.count || 0), enrollmentCount: Number(enrollmentCountResult[0]?.count || 0) };
      })
    );
    res.json(coursesWithStats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/courses/:id", async (req: Request, res: Response) => {
  try {
    const courseDetails = await getCourseDetails(req.params.id);
    if (!courseDetails) return res.status(404).json({ error: "Course not found" });
    res.json(courseDetails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/courses/:courseId/discussions", async (req: Request, res: Response) => {
  try {
    const discussions = await getCourseDiscussions(req.params.courseId);
    res.json(discussions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/discussions/:discussionId", async (req: Request, res: Response) => {
  try {
    const discussion = await getDiscussionById(req.params.discussionId);
    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }
    res.json(discussion);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/discussions", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const validatedData = insertCourseDiscussionSchema.parse({ ...req.body, authorId: req.user.id });
    const newDiscussion = await storage.createDiscussion(validatedData);
    await db.update(users).set({ engagementScore: sql`${users.engagementScore} + 5` }).where(eq(users.id, req.user.id));
    
    // Recalculate totalPoints after engagement score change
    await updateTotalPointsAfterScoreChange(req.user.id).catch((err: any) => 
      console.error("Failed to update total points:", err)
    );

    if (newDiscussion) await checkAndAwardCourseBadges(req.user.id, String(validatedData.courseId));
    
    // Track streak for course discussion
    await updateUserStreakForActivity(req.user.id, 'COURSE_DISCUSSION').catch((error) => {
      console.error('Failed to update streak for course discussion:', error);
    });
    
    res.json(newDiscussion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/discussions/:discussionId", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { discussionId } = req.params;
    const { title, content, isResolved } = req.body;

    // Get the discussion to check authorization
    const [discussion] = await db
      .select()
      .from(courseDiscussions)
      .where(eq(courseDiscussions.id, discussionId));

    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }

    // Only the author or master_admin can update
    if (discussion.authorId !== req.user.id && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Not authorized to update this discussion" });
    }

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (isResolved !== undefined) updates.isResolved = isResolved;

    const updated = await storage.updateDiscussion(discussionId, updates);
    if (!updated) {
      return res.status(404).json({ error: "Failed to update discussion" });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/discussions/:discussionId", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { discussionId } = req.params;

    // Get the discussion to check authorization
    const [discussion] = await db
      .select()
      .from(courseDiscussions)
      .where(eq(courseDiscussions.id, discussionId));

    if (!discussion) {
      return res.status(404).json({ error: "Discussion not found" });
    }

    // Only the author or master_admin can delete
    if (discussion.authorId !== req.user.id && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Not authorized to delete this discussion" });
    }

    const deleted = await storage.deleteDiscussion(discussionId);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete discussion" });
    }

    res.json({ success: true, message: "Discussion deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/discussions/:discussionId/replies", async (req: Request, res: Response) => {
  try {
    const replies = await getDiscussionReplies(req.params.discussionId);
    res.json(replies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/replies", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const validatedData = insertDiscussionReplySchema.parse({ ...req.body, authorId: req.user.id });
    const newReply = await storage.createReply(validatedData);
    await db.update(users).set({ engagementScore: sql`${users.engagementScore} + 3` }).where(eq(users.id, req.user.id));

    // Recalculate totalPoints after engagement score change
    await updateTotalPointsAfterScoreChange(req.user.id).catch((err: any) => 
      console.error("Failed to update total points:", err)
    );

    const [discussion] = await db.select().from(courseDiscussions).where(eq(courseDiscussions.id, validatedData.discussionId));
    if (discussion && discussion.authorId !== req.user.id) {
      await db.insert(notifications).values({
        userId: discussion.authorId,
        type: "comment",
        title: "New Reply",
        message: `${req.user.firstName} ${req.user.lastName} replied to your discussion`,
        link: `/forums/${discussion.courseId}/${discussion.id}`,
      });
    }
    if (discussion && discussion.courseId) await checkAndAwardCourseBadges(req.user.id, discussion.courseId);
    
    // Track streak for course reply
    await updateUserStreakForActivity(req.user.id, 'COURSE_REPLY').catch((error) => {
      console.error('Failed to update streak for course reply:', error);
    });
    
    res.json(newReply);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/replies/:replyId", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { replyId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content is required" });
    }

    // Get the reply to check authorization
    const [reply] = await db
      .select()
      .from(discussionReplies)
      .where(eq(discussionReplies.id, replyId));

    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    // Only the author or master_admin can update
    if (reply.authorId !== req.user.id && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Not authorized to update this reply" });
    }

    const updated = await storage.updateReply(replyId, content);
    if (!updated) {
      return res.status(404).json({ error: "Failed to update reply" });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/replies/:replyId", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const { replyId } = req.params;

    // Get the reply to check authorization
    const [reply] = await db
      .select()
      .from(discussionReplies)
      .where(eq(discussionReplies.id, replyId));

    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    // Only the author or master_admin can delete
    if (reply.authorId !== req.user.id && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: "Not authorized to delete this reply" });
    }

    const deleted = await storage.deleteReply(replyId);
    if (!deleted) {
      return res.status(500).json({ error: "Failed to delete reply" });
    }

    res.json({ success: true, message: "Reply deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/discussions/:discussionId/upvote", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const upvoted = await storage.toggleDiscussionUpvote(req.user.id, req.params.discussionId);
    
    // Track streak for upvoting a discussion (only if newly upvoted)
    if (upvoted) {
      await updateUserStreakForActivity(req.user.id, 'COURSE_UPVOTE').catch((error) => {
        console.error('Failed to update streak for course upvote:', error);
      });
    }
    
    res.json({ upvoted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/replies/:replyId/upvote", isAuthenticated, async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const upvoted = await storage.toggleReplyUpvote(req.user.id, req.params.replyId);
    
    // Track streak for upvoting a reply (only if newly upvoted)
    if (upvoted) {
      await updateUserStreakForActivity(req.user.id, 'COURSE_REPLY_UPVOTE').catch((error) => {
        console.error('Failed to update streak for course reply upvote:', error);
      });
    }
    
    res.json({ upvoted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
