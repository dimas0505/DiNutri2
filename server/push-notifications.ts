// ARQUIVO: ./server/push-notifications.ts
// Serviço de notificações push usando a Web Push API (VAPID)

import webpush from 'web-push';
import { db } from './db.js';
import { pushSubscriptions, users, patients } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Configuração das chaves VAPID
// As chaves devem ser definidas nas variáveis de ambiente do servidor.
// Para gerar novas chaves: node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k);"
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@dinutri.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[PushNotifications] VAPID configurado com sucesso.');
} else {
  console.warn('[PushNotifications] VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY não definidos. Notificações push desabilitadas.');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  type?: 'plan' | 'assessment' | 'message';
}

/**
 * Envia uma notificação push para um único usuário (pelo userId).
 * Retorna o número de notificações enviadas com sucesso.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[PushNotifications] Notificações push desabilitadas (sem chaves VAPID).');
    return 0;
  }

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) {
    console.log(`[PushNotifications] Nenhuma assinatura encontrada para userId=${userId}`);
    return 0;
  }

  let sent = 0;
  const toDelete: string[] = [];

  for (const sub of subs) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      sent++;
      console.log(`[PushNotifications] Notificação enviada para userId=${userId}, endpoint=${sub.endpoint.substring(0, 50)}...`);
    } catch (err: any) {
      console.error(`[PushNotifications] Erro ao enviar para userId=${userId}:`, err.statusCode, err.message);
      // Se o endpoint expirou ou é inválido (410 Gone / 404 Not Found), marcar para remoção
      if (err.statusCode === 410 || err.statusCode === 404) {
        toDelete.push(sub.id);
      }
    }
  }

  // Remover assinaturas inválidas/expiradas
  for (const id of toDelete) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
    console.log(`[PushNotifications] Assinatura expirada removida: id=${id}`);
  }

  return sent;
}

/**
 * Envia uma notificação push para todos os pacientes de um nutricionista.
 * Retorna o número total de notificações enviadas.
 */
export async function sendPushToAllPatients(nutritionistId: string, payload: PushPayload): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[PushNotifications] Notificações push desabilitadas (sem chaves VAPID).');
    return 0;
  }

  // Buscar todos os pacientes do nutricionista que têm conta de usuário
  const patientUsers = await db
    .select({ userId: patients.userId })
    .from(patients)
    .where(eq(patients.ownerId, nutritionistId));

  let totalSent = 0;
  for (const p of patientUsers) {
    if (p.userId) {
      const sent = await sendPushToUser(p.userId, payload);
      totalSent += sent;
    }
  }

  console.log(`[PushNotifications] Total enviado para pacientes de nutritionistId=${nutritionistId}: ${totalSent}`);
  return totalSent;
}

/**
 * Retorna a chave pública VAPID para ser usada pelo frontend ao criar assinaturas.
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
