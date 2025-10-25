// uninexus-identity-service/src/routes.ts
import { Router } from "express";
import { identityStorage } from "./storage";
import { insertUserSchema } from "@uninexus/shared/identity-schema"; 
import { z } from "zod";

const router = Router();

// Authentication routes
router.post("/auth/register", async (req, res) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const existingUser = await identityStorage.getUserByFirebaseUid(userData.firebaseUid);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }
    const user = await identityStorage.createUser(userData);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/auth/user/:firebaseUid", async (req, res) => { /* ... */ });
router.patch("/auth/user/:id", async (req, res) => { /* ... */ });

export default router;
