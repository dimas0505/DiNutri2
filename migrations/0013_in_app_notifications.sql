-- Migration: 0013_in_app_notifications
-- Cria a tabela de notificações in-app como fallback para pacientes
-- que não autorizaram (ou revogaram) as notificações push do sistema.
-- Garante que o paciente sempre receba mensagens do nutricionista dentro do app.

CREATE TABLE IF NOT EXISTS "in_app_notifications" (
  "id" varchar PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar NOT NULL,
  "body" text NOT NULL,
  "type" varchar NOT NULL DEFAULT 'general',
  "is_read" boolean NOT NULL DEFAULT false,
  "url" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_in_app_notifications_user" ON "in_app_notifications" ("user_id");
