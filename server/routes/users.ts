import { Router, Request, Response } from "express";
import { eq, desc, and, or, sql, notInArray } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { uploadToCloud } from "../cloudStorage";
import {
  users,
  courses,
  groups,
  groupMembers,
  educationRecords,
  jobExperience,
  studentCourses,
  notifications,
  userConnections,
  insertEducationRecordSchema,
  insertJobExperienceSchema,
  insertStudentCourseSchema,
} from "@shared/schema";

const router = Router();

// Configure multer for local storage fallback
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post("/upload/image", requireAuth, upload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  try {
    const cloudResult = await uploadToCloud(req.file.buffer, {
      folder: "avatars",
      contentType: req.file.mimetype,
      originalFilename: req.file.originalname,
    });

    if (cloudResult) {
      return res.json({ url: cloudResult.url });
    }

    // Fallback to local storage if cloud is unavailable
    const uploadsDir = path.join(process.cwd(), "uploads", "images");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${Date.now()}-${req.file.originalname.replace(/[^a-z0-9.]/gi, "_")}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const url = `${baseUrl}/uploads/images/${filename}`;

    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/teachers", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  try {
    const user = req.user as any;
    let query = db.select().from(users).where(eq(users.role, "teacher"));

    // Scope restriction: University Admins only see affiliated teachers
    if (user.role === 'university_admin' || user.role === 'university') {
      if (user.university) {
        query = db.select().from(users).where(
          and(
            eq(users.role, "teacher"),
            eq(users.university, user.university)
          )
        );
      }
    }

    const teachers = await query.orderBy(users.lastName, users.firstName);
    res.json(teachers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/students", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");
  
  try {
    const user = req.user as any;
    let query = db.select().from(users).where(eq(users.role, "student"));

    // Scope restriction: Teachers and University Admins only see affiliated students
    if (user.role === 'teacher' || user.role === 'university_admin' || user.role === 'university') {
      if (user.university) {
        query = db.select().from(users).where(
          and(
            eq(users.role, "student"),
            eq(users.university, user.university)
          )
        );
      }
    }

    const students = await query.orderBy(desc(users.engagementScore));
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/teachers/university/:university", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { university } = req.params;

    const teachers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "teacher"),
          eq(users.university, university)
        )
      )
      .orderBy(users.lastName, users.firstName);

    res.json(teachers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/teachers/:teacherId/students", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { teacherId } = req.params;

    const validatedStudents = await db
      .select({
        studentCourse: studentCourses,
        student: users,
      })
      .from(studentCourses)
      .leftJoin(users, eq(studentCourses.userId, users.id))
      .where(
        and(
          eq(studentCourses.validatedBy, teacherId),
          eq(studentCourses.isValidated, true)
        )
      )
      .orderBy(desc(studentCourses.validatedAt));

    const uniqueStudentsMap = new Map();
    for (const item of validatedStudents) {
      if (item.student && !uniqueStudentsMap.has(item.student.id)) {
        uniqueStudentsMap.set(item.student.id, {
          ...item.student,
          validatedCourses: [item.studentCourse],
        });
      } else if (item.student) {
        uniqueStudentsMap.get(item.student.id).validatedCourses.push(item.studentCourse);
      }
    }

    res.json(Array.from(uniqueStudentsMap.values()));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/university/teachers", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  const isUniversityAdmin = ['university', 'university_admin', 'master_admin'].includes(req.user.role);
  if (!isUniversityAdmin) {
    return res.status(403).json({ error: "Only university admins can access this" });
  }

  try {
    const universityName = req.user.university;
    if (!universityName) {
      return res.status(400).json({ error: "University not set for this admin" });
    }

    const teachers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "teacher"),
          eq(users.university, universityName)
        )
      )
      .orderBy(users.lastName, users.firstName);

    const teachersWithCourses = await Promise.all(
      teachers.map(async (teacher) => {
        const teacherCourses = await db
          .select()
          .from(courses)
          .where(eq(courses.instructorId, teacher.id));

        const validatedCount = teacherCourses.filter(c => c.isUniversityValidated).length;
        const pendingCount = teacherCourses.filter(c => c.universityValidationStatus === 'pending' && !c.isUniversityValidated).length;

        return {
          ...teacher,
          courseCount: teacherCourses.length,
          validatedCourseCount: validatedCount,
          pendingCourseCount: pendingCount,
        };
      })
    );

    res.json(teachersWithCourses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/users/search", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { q, excludeConnected } = req.query;
    const searchTerm = q as string;

    if (!searchTerm || searchTerm.length < 3) {
      return res.json([]);
    }

    const searchPattern = `%${searchTerm}%`;
    const currentUserId = req.user.id;
    
    // Get connected user IDs to exclude from search results
    let connectedUserIds: string[] = [];
    if (excludeConnected === 'true') {
      const connections = await db
        .select()
        .from(userConnections)
        .where(
          and(
            or(
              eq(userConnections.requesterId, currentUserId),
              eq(userConnections.receiverId, currentUserId)
            ),
            eq(userConnections.status, 'accepted')
          )
        );
      
      connectedUserIds = connections.map(c => 
        c.requesterId === currentUserId ? c.receiverId : c.requesterId
      );
    }
    
    // Build query conditions
    const baseConditions = and(
      sql`${users.id} != ${currentUserId}`,
      or(
        sql`${users.firstName} ILIKE ${searchPattern}`,
        sql`${users.lastName} ILIKE ${searchPattern}`,
        sql`${users.email} ILIKE ${searchPattern}`,
        sql`${users.major} ILIKE ${searchPattern}`,
        sql`${users.company} ILIKE ${searchPattern}`,
        sql`${users.university} ILIKE ${searchPattern}`
      )
    );

    let results;
    if (connectedUserIds.length > 0) {
      results = await db
        .select()
        .from(users)
        .where(
          and(
            baseConditions,
            notInArray(users.id, connectedUserIds)
          )
        )
        .limit(20);
    } else {
      results = await db
        .select()
        .from(users)
        .where(baseConditions)
        .limit(20);
    }

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/users/groups", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const results = await db
      .select({
        membership: groupMembers,
        group: groups,
      })
      .from(groupMembers)
      .leftJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, req.user.id))
      .orderBy(desc(groupMembers.joinedAt));

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/users/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/users/:userId/education", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { userId } = req.params;

    const [targetUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (targetUser.role !== 'student' && targetUser.role !== 'teacher') {
      return res.json([]);
    }

    if (req.user.role !== 'student' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: "Access denied: Education records are only available for student and teacher roles" });
    }

    const records = await db
      .select()
      .from(educationRecords)
      .where(eq(educationRecords.userId, userId))
      .orderBy(desc(educationRecords.isCurrent), desc(educationRecords.startDate));

    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/education", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validated = insertEducationRecordSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    const [record] = await db
      .insert(educationRecords)
      .values(validated)
      .returning();

    res.json(record);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/education/:id", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { id } = req.params;
    
    const [existing] = await db
      .select()
      .from(educationRecords)
      .where(eq(educationRecords.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Education record not found" });
    }

    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update this record" });
    }

    const [updated] = await db
      .update(educationRecords)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(educationRecords.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/education/:id", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { id } = req.params;
    
    const [existing] = await db
      .select()
      .from(educationRecords)
      .where(eq(educationRecords.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Education record not found" });
    }

    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this record" });
    }

    await db
      .delete(educationRecords)
      .where(eq(educationRecords.id, id));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/users/:userId/job-experience", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const experiences = await db
      .select()
      .from(jobExperience)
      .where(eq(jobExperience.userId, userId))
      .orderBy(desc(jobExperience.isCurrent), desc(jobExperience.startDate));

    res.json(experiences);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/job-experience", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const validated = insertJobExperienceSchema.parse({
      ...req.body,
      userId: req.user.id,
    });

    const [experience] = await db
      .insert(jobExperience)
      .values(validated)
      .returning();

    res.json(experience);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/job-experience/:id", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { id } = req.params;
    
    const [existing] = await db
      .select()
      .from(jobExperience)
      .where(eq(jobExperience.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Job experience not found" });
    }

    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update this experience" });
    }

    const [updated] = await db
      .update(jobExperience)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(jobExperience.id, id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/job-experience/:id", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { id } = req.params;
    
    const [existing] = await db
      .select()
      .from(jobExperience)
      .where(eq(jobExperience.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Job experience not found" });
    }

    if (existing.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to delete this experience" });
    }

    await db
      .delete(jobExperience)
      .where(eq(jobExperience.id, id));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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

router.post("/student-courses", async (req: Request, res: Response) => {
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

router.patch("/student-courses/:id", async (req: Request, res: Response) => {
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

router.delete("/student-courses/:id", async (req: Request, res: Response) => {
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

router.post("/student-courses/:id/validate", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: "Only teachers can validate courses" });
  }

  try {
    const { id } = req.params;
    const { validationNote } = req.body;

    const [existing] = await db
      .select()
      .from(studentCourses)
      .where(eq(studentCourses.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Course not found" });
    }

    const [updated] = await db
      .update(studentCourses)
      .set({
        isValidated: true,
        validatedBy: req.user.id,
        validatedAt: new Date(),
        validationNote: validationNote || null,
        updatedAt: new Date(),
      })
      .where(eq(studentCourses.id, id))
      .returning();

    await db.insert(notifications).values({
      userId: existing.userId,
      type: "validation",
      title: "Course Validated!",
      message: `Your course "${existing.courseName}" was validated by ${req.user.firstName} ${req.user.lastName}`,
      link: "/profile",
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/users/:userId/profile", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { userId } = req.params;

    if (userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to update this profile" });
    }

    const { bio, interests, profileImageUrl } = req.body;

    const [updated] = await db
      .update(users)
      .set({
        bio,
        interests,
        profileImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
