import { Router, Request, Response } from "express";
import { eq, desc, and, or } from "drizzle-orm";
import { db } from "../db";
import { isAuthenticated, type AuthRequest } from "../firebaseAuth";
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

router.get("/notifications/unread-count", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, req.user!.id), eq(notifications.isRead, false)));

    const count = result.length;
    res.json({ count });
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

router.patch("/notifications/mark-all-read", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.user!.id));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/notifications/groups/unread-count", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.userId, req.user!.id),
        eq(notifications.isRead, false),
        or(
          eq(notifications.type, 'group_post'),
          eq(notifications.type, 'group_activity'),
          eq(notifications.type, 'group_invitation')
        )
      ));

    const count = result.length;
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/notifications/courses/unread-count", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db
      .select({ count: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.userId, req.user!.id),
        eq(notifications.isRead, false),
        or(
          eq(notifications.type, 'course_material'),
          eq(notifications.type, 'course_assignment'),
          eq(notifications.type, 'course_announcement'),
          eq(notifications.type, 'course_graded')
        )
      ));

    const count = result.length;
    res.json({ count });
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

export default router;
