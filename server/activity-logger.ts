import { db } from './db.js';
import { activityLog } from '../shared/schema.js';

interface LogActivityPayload {
  userId: string;
  activityType: string;
  details?: string;
}

export const logActivity = async (payload: LogActivityPayload) => {
  try {
    await db.insert(activityLog).values({
      userId: payload.userId,
      activityType: payload.activityType,
      details: payload.details,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};