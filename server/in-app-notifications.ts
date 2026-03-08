// ARQUIVO: ./server/in-app-notifications.ts
// Serviço de notificações in-app (inbox interno do paciente).
//
// Funciona como fallback SEMPRE ATIVO para pacientes que:
//   - Negaram a permissão de notificações push do sistema
//   - Revogaram a permissão depois de ter concedido
//   - Não instalaram o app como PWA
//
// A notificação in-app é salva no banco de dados e exibida dentro do app
// como um "sininho" com badge de não lidas no dashboard do paciente.
// O paciente vê as mensagens ao abrir o app, independente de qualquer permissão.

import { db } from './db.js';
import { inAppNotifications, patients } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface InAppPayload {
  title: string;
  body: string;
  type: 'plan' | 'assessment' | 'message' | 'general';
  url?: string;
}

/**
 * Cria uma notificação in-app para um único usuário (pelo userId).
 */
export async function createInAppNotification(userId: string, payload: InAppPayload): Promise<void> {
  try {
    await db.insert(inAppNotifications).values({
      id: nanoid(),
      userId,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      url: payload.url ?? null,
    });
    console.log(`[InAppNotifications] Notificação criada para userId=${userId}: "${payload.title}"`);
  } catch (err) {
    console.error(`[InAppNotifications] Erro ao criar notificação para userId=${userId}:`, err);
  }
}

/**
 * Cria notificações in-app para todos os pacientes de um nutricionista.
 */
export async function createInAppNotificationForAllPatients(
  nutritionistId: string,
  payload: InAppPayload
): Promise<number> {
  const patientUsers = await db
    .select({ userId: patients.userId })
    .from(patients)
    .where(eq(patients.ownerId, nutritionistId));

  let count = 0;
  for (const p of patientUsers) {
    if (p.userId) {
      await createInAppNotification(p.userId, payload);
      count++;
    }
  }
  console.log(`[InAppNotifications] ${count} notificações criadas para pacientes de nutritionistId=${nutritionistId}`);
  return count;
}
