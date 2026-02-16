import { db } from "../db";
import { notifications, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export type NotificationType = 
  | 'validation' 
  | 'challenge' 
  | 'achievement' 
  | 'comment' 
  | 'connection' 
  | 'message' 
  | 'system';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Creates a notification and handles related side effects like logging or socket events if needed
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const [notification] = await db.insert(notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      isRead: false,
    }).returning();

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Utility to notify multiple users at once (e.g., for a university-wide announcement)
 */
export async function notifyMultipleUsers(userIds: string[], params: Omit<CreateNotificationParams, 'userId'>) {
  if (userIds.length === 0) return;

  try {
    const values = userIds.map(userId => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      isRead: false,
    }));

    return await db.insert(notifications).values(values).returning();
  } catch (error) {
    console.error("Error creating multiple notifications:", error);
    throw error;
  }
}
