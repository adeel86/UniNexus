import { Router, Request, Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  teacherContent,
  courses,
  users,
  insertTeacherContentSchema,
} from "@shared/schema";
import { uploadToCloud, isCloudStorageAvailable } from "../cloudStorage";
import { requireAuth, requireRole, AuthRequest } from "./shared";

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
const documentsDir = path.join(uploadsDir, 'documents');

if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

const memoryStorage = multer.memoryStorage();

const documentUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, PPT, and PPTX are allowed.'));
    }
  }
});

async function saveFileLocally(buffer: Buffer, folder: string, filename: string): Promise<string> {
  const targetDir = path.join(uploadsDir, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const uniqueFilename = `${Date.now()}-${filename}`;
  const filePath = path.join(targetDir, uniqueFilename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${folder}/${uniqueFilename}`;
}

router.post("/:contentId/index", requireAuth, requireRole('teacher', 'master_admin'), async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const aiChatbot = await import("../aiChatbot");
    const chunksIndexed = await aiChatbot.indexTeacherContent(contentId);
    res.json({ success: true, chunksIndexed });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/upload", requireAuth, requireRole('teacher', 'master_admin'), documentUpload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No document file provided" });
    }

    const { courseId } = req.body;

    if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
      return res.status(400).json({ 
        error: "Course ID is required. Materials must be uploaded to a validated course." 
      });
    }

    const [targetCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId.trim()))
      .limit(1);

    if (!targetCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    const user = req.user as any;
    if (targetCourse.instructorId !== user.id && user.role !== 'master_admin') {
      return res.status(403).json({ error: "You can only upload to your own courses" });
    }

    if (!targetCourse.isUniversityValidated) {
      return res.status(400).json({ 
        error: "Course must be validated by the university before uploading materials" 
      });
    }

    let fileUrl: string;

    if (isCloudStorageAvailable()) {
      const result = await uploadToCloud(req.file.buffer, {
        folder: 'documents',
        contentType: req.file.mimetype,
        originalFilename: req.file.originalname,
      });
      
      if (result) {
        fileUrl = result.url;
      } else {
        fileUrl = await saveFileLocally(req.file.buffer, 'documents', req.file.originalname);
      }
    } else {
      fileUrl = await saveFileLocally(req.file.buffer, 'documents', req.file.originalname);
    }
    
    const { title, description, tags, isPublic } = req.body;

    let contentType = 'doc';
    if (req.file.mimetype === 'application/pdf') contentType = 'pdf';
    else if (req.file.mimetype === 'text/plain') contentType = 'text';

    const metadata = {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };

    const [content] = await db
      .insert(teacherContent)
      .values({
        teacherId: user.id,
        title: (title && typeof title === 'string' ? title.trim() : null) || req.file.originalname,
        description: description && typeof description === 'string' ? description.trim() : null,
        courseId: courseId.trim(),
        contentType,
        fileUrl,
        metadata,
        tags: tags && typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        isPublic: isPublic === 'true' || isPublic === true,
      })
      .returning();

    res.json({ url: fileUrl, content });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", requireAuth, requireRole('teacher', 'master_admin'), async (req: Request, res: Response) => {
  try {
    const validatedData = insertTeacherContentSchema.parse({
      ...req.body,
      teacherId: (req.user as any).id,
    });

    const [content] = await db
      .insert(teacherContent)
      .values(validatedData)
      .returning();

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/teacher/:teacherId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;

    const content = await db
      .select()
      .from(teacherContent)
      .where(eq(teacherContent.teacherId, teacherId))
      .orderBy(desc(teacherContent.uploadedAt));

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/course/:courseId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const content = await db
      .select()
      .from(teacherContent)
      .where(eq(teacherContent.courseId, courseId))
      .orderBy(desc(teacherContent.uploadedAt));

    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, tags, isPublic } = req.body;
    const user = req.user as any;

    const [existingContent] = await db
      .select()
      .from(teacherContent)
      .where(eq(teacherContent.id, id));

    if (!existingContent) {
      return res.status(404).json({ error: "Content not found" });
    }

    if (existingContent.teacherId !== user.id && user.role !== 'master_admin') {
      return res.status(403).json({ error: "Not authorized to update this content" });
    }

    const [updatedContent] = await db
      .update(teacherContent)
      .set({
        title: title || existingContent.title,
        description: description !== undefined ? description : existingContent.description,
        tags: tags !== undefined ? tags : existingContent.tags,
        isPublic: isPublic !== undefined ? isPublic : existingContent.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(teacherContent.id, id))
      .returning();

    res.json(updatedContent);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user as any;

    const [content] = await db
      .select()
      .from(teacherContent)
      .where(eq(teacherContent.id, id));

    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    if (content.teacherId !== user.id && user.role !== 'master_admin') {
      return res.status(403).json({ error: "Not authorized to delete this content" });
    }

    if (content.fileUrl) {
      const filePath = path.join(uploadsDir, content.fileUrl.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.delete(teacherContent).where(eq(teacherContent.id, id));

    res.json({ message: "Content deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
