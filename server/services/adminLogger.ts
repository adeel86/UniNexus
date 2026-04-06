import { db } from "../db";
import { adminActionLogs } from "@shared/schema";

export async function logAdminAction(params: {
  adminId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(adminActionLogs).values({
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      details: params.details ?? null,
    });
  } catch (err) {
    console.error("[adminLogger] Failed to log admin action:", err);
  }
}
