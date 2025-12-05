import { Router, Request, Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { notifications } from "@shared/schema";

const router = Router();

router.get("/notifications", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    res.json(userNotifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/notifications/:notificationId/read", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { notificationId } = req.params;

    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/notifications/mark-all-read", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.user.id));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/notifications/:notificationId", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    const { notificationId } = req.params;

    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await db.delete(notifications).where(eq(notifications.id, notificationId));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/notifications/clear-all", async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized");
  }

  try {
    await db.delete(notifications).where(eq(notifications.userId, req.user.id));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
