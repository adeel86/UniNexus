// uninexus-identity-service/src/controllers/studentProfileController.ts

import { Router, type Request, type Response } from "express";
import { db } from "../db/db";
import { users } from "../db/schema"; // The User/Profile Drizzle schema for this service
import { insertUserSchema } from "@uninexus/shared/types/user";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// --- IDENTITY STORAGE LOGIC (Extracted from original storage.ts) ---
async function getUserByFirebaseUid(firebaseUid: string) {
  // Placeholder logic for getting user by UID
  const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
  return user;
}
async function createUser(userData: z.infer<typeof insertUserSchema>) {
  // Placeholder logic for creating user
  const [user] = await db.insert(users).values(userData).returning();
  return user;
}
// ------------------------------------------------------------------

// --- ROUTES (Extracted from original routes.ts) ---
router.post("/register", async (req: Request, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);

    const existingUser = await getUserByFirebaseUid(userData.firebaseUid);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const user = await createUser(userData);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/user/:firebaseUid", async (req: Request, res: Response) => {
  try {
    const user = await getUserByFirebaseUid(req.params.firebaseUid);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add logic for /api/auth/user/:id PUT/PATCH here...

export default router;
