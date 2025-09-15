// server/activity-logger.ts

import { db } from './db.js';
import { activityLog } from '../shared/schema.js';
import { nanoid } from 'nanoid';

interface LogActivityPayload {
  userId: string;
  activityType: string;
  details?: string;
}

export const logActivity = async (payload: LogActivityPayload) => {
  try {
    await db.insert(activityLog).values({
      id: nanoid(),
      userId: payload.userId,
      activityType: payload.activityType,
      details: payload.details,
    });
  } catch (error) {
    // É importante que o log de atividade não quebre a aplicação principal.
    // Em um ambiente de produção, use um sistema de logs mais robusto aqui.
    console.error("Failed to log activity:", error);
  }
};