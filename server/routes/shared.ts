import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadToCloud } from "../cloudStorage";

const router = Router();

export type { AuthRequest } from "../firebaseAuth";

export const uploadsDir = path.join(process.cwd(), 'uploads');

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function saveFileLocally(buffer: Buffer, folder: string, filename: string): Promise<string> {
  const targetDir = path.join(uploadsDir, folder);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const uniqueFilename = `${Date.now()}-${filename}`;
  const filePath = path.join(targetDir, uniqueFilename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${folder}/${uniqueFilename}`;
}

export function blockRestrictedRoles(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const restrictedRoles = ['master_admin'];
  if (restrictedRoles.includes((req.user as any).role)) {
    return res.status(403).json({ 
      error: "Access Denied",
      message: "Master admin does not have access to social features." 
    });
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userRole = (req.user as any)?.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: "Forbidden", message: `Role ${userRole} not authorized` });
    }
    next();
  };
}

router.post("/api/upload/video", requireAuth, upload.single("video"), async (req: Request, res: Response) => {
  if (!req.file) {
    console.error("Video upload failed: No file in request");
    return res.status(400).json({ error: "No video file provided" });
  }

  try {
    const cloudResult = await uploadToCloud(req.file.buffer, {
      folder: "videos",
      contentType: req.file.mimetype,
      originalFilename: req.file.originalname,
    });

    const url = cloudResult?.url || await saveFileLocally(req.file.buffer, "videos", req.file.originalname);
    res.json({ url });
  } catch (error: any) {
    console.error("Video upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/upload/images", requireAuth, upload.array("images", 5), async (req: Request, res: Response) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ error: "No images provided" });
  }

  try {
    const uploadPromises = ((req.files as Express.Multer.File[]) || []).map(async (file) => {
      const cloudResult = await uploadToCloud(file.buffer, {
        folder: "images",
        contentType: file.mimetype,
        originalFilename: file.originalname,
      });
      return cloudResult?.url || await saveFileLocally(file.buffer, "images", file.originalname);
    });

    const urls = await Promise.all(uploadPromises);
    res.json({ urls });
  } catch (error: any) {
    console.error("Images upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const sharedRouter = router;
export default router;
