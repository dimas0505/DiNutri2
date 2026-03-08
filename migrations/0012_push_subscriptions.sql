-- Migration: 0012_push_subscriptions
-- Cria a tabela para armazenar assinaturas de notificações push (Web Push API)

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" varchar PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_push_subscriptions_user" ON "push_subscriptions" ("user_id");
