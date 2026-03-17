-- Migration: 0014_notification_templates
-- Cria a tabela de modelos de notificações do nutricionista.
-- Permite que o nutricionista salve, edite e reutilize modelos
-- de título e corpo de mensagem para envio rápido de notificações.
CREATE TABLE IF NOT EXISTS "notification_templates" (
  "id" varchar PRIMARY KEY NOT NULL,
  "nutritionist_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(100) NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "IDX_notification_templates_nutritionist" ON "notification_templates" ("nutritionist_id");
