# Configuração de Notificações Push — DiNutri2

## Visão Geral

O sistema de notificações push foi implementado usando a **Web Push API** com autenticação **VAPID**, o padrão para Progressive Web Apps (PWA). As notificações chegam ao dispositivo do paciente **mesmo com o aplicativo fechado**, desde que o paciente tenha:

1. Instalado o app como PWA (botão "Adicionar à tela inicial")
2. Concedido permissão de notificações no app

---

## Cenários de Notificação

| Evento | Destinatário | Ação do Nutricionista |
|---|---|---|
| Plano alimentar publicado | Paciente específico | Clicar em "Publicar" na prescrição |
| Relatório de avaliação física enviado | Paciente específico | Fazer upload de documento em "Avaliações" |
| Mensagem personalizada | Um paciente ou todos | Usar a tela "Enviar Notificação" |

---

## Configuração Obrigatória no Servidor

Para que as notificações funcionem, você precisa adicionar as seguintes **variáveis de ambiente** no servidor de produção (Replit, Render, Railway, etc.):

```
VAPID_PUBLIC_KEY=BGKKOirr7QB_WGX4VPj87pYfwe5HNZtGXS8jtTmhR-QgGTCeTh0t_VDXG7BrhYQW-QgRVHb8ML5IxS2_SVN7X2E
VAPID_PRIVATE_KEY=zMl4iQipDDjcCdF-BK1qglna675kx4IfTuYJEZ_WpAo
VAPID_EMAIL=mailto:seu-email@dominio.com
```

> **Importante:** As chaves VAPID acima foram geradas especificamente para este projeto. Guarde-as em local seguro. Se você precisar gerar novas chaves, execute:
> ```bash
> node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k);"
> ```

---

## Migração do Banco de Dados

Execute o arquivo SQL de migração para criar a tabela de assinaturas push:

```sql
-- migrations/0012_push_subscriptions.sql
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
```

Ou, se o projeto usa `drizzle-kit push`, basta executar:
```bash
npm run db:push
```

---

## Como o Paciente Ativa as Notificações

1. O paciente acessa o app e faz login
2. Vai em **Perfil** (ícone de usuário na barra inferior)
3. Na aba **Dados Pessoais**, aparece o card **"Notificações Push"**
4. Clica em **"Ativar"** e concede permissão no popup do navegador
5. Pronto! O dispositivo está registrado e receberá notificações

> **Nota:** As notificações push funcionam apenas quando o app está instalado como PWA (modo standalone). Em navegadores comuns sem instalação, as notificações ainda aparecem, mas podem ser bloqueadas por configurações do navegador.

---

## Como o Nutricionista Envia Mensagens

### Via tela dedicada:
1. Na lista de pacientes, clica em **"Enviar Notificação aos Pacientes"**
2. Escolhe entre **"Todos os pacientes"** ou **"Paciente específico"**
3. Preenche o título e a mensagem
4. Visualiza o preview da notificação
5. Clica em **"Enviar"**

### Via sidebar (desktop):
- Clica no ícone de sino (🔔) na barra lateral esquerda

---

## Arquivos Modificados/Criados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `server/push-notifications.ts` | Novo | Serviço de envio de notificações push (VAPID) |
| `server/routes.ts` | Modificado | Endpoints de push + triggers automáticos |
| `shared/schema.ts` | Modificado | Tabela `push_subscriptions` |
| `migrations/0012_push_subscriptions.sql` | Novo | Migração SQL da nova tabela |
| `client/src/hooks/usePushNotifications.ts` | Novo | Hook React para gerenciar permissões |
| `client/src/components/PushNotificationManager.tsx` | Novo | Componente UI de ativar/desativar |
| `client/src/pages/nutritionist/send-notification.tsx` | Novo | Tela de envio de mensagens |
| `client/src/pages/patient/profile.tsx` | Modificado | Card de notificações no perfil |
| `client/src/pages/nutritionist/patients.tsx` | Modificado | Botão de notificações |
| `client/src/components/layout/nutritionist-sidebar.tsx` | Modificado | Link de notificações na sidebar |
| `client/src/components/layout/mobile-layout.tsx` | Modificado | Link no menu drawer mobile |
| `client/src/App.tsx` | Modificado | Rota `/notifications/send` |
| `client/public/sw.js` | Modificado | Handler de clique nas notificações |
| `package.json` | Modificado | Dependência `web-push` adicionada |
