import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import { storage, deleteFoodDiaryPhoto } from "./storage.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import { insertPatientSchema, updatePatientSchema, insertPrescriptionSchema, updatePrescriptionSchema, insertMoodEntrySchema, insertAnamnesisRecordSchema, insertFoodDiaryEntrySchema, insertSubscriptionSchema, insertAnthropometricAssessmentSchema, updateAnthropometricAssessmentSchema } from "../shared/schema.js";
import { z } from "zod";
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { put } from '@vercel/blob';
import multer from 'multer';
import { eq, and, desc, or, sql, inArray } from 'drizzle-orm';
import { anamnesisRecords, foodDiaryEntries, prescriptions, users, patients, subscriptions, activityLog, patientDocuments, anthropometricAssessments, pushSubscriptions, inAppNotifications, notificationTemplates } from '../shared/schema.js';
import { db } from './db.js';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { logActivity } from './activity-logger.js';
import { sendPushToUser, sendPushToAllPatients, getVapidPublicKey } from './push-notifications.js';
import { createInAppNotification, createInAppNotificationForAllPatients } from './in-app-notifications.js';
import ExcelJS from 'exceljs';

const SALT_ROUNDS = 10;
const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

function formatDateInBrazilTimezone(value: Date | string | null | undefined, includeTime = false): string {
  if (!value) return 'N/A';

  const parsedDate = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return 'N/A';

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }
      : {}),
  });

  return formatter.format(parsedDate);
}

// Configure multer for in-memory file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  },
});

// Configure multer for document uploads (PDF + images)
const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas PDF e imagens são permitidos'));
    }
  },
});

// Middleware to check if the user is an admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
  }
  next();
};

export async function setupRoutes(app: Express): Promise<void> {
  await setupAuth(app);
  
  // Middleware para parsear o corpo da requisição de upload
  app.use(bodyParser.json());

  // --- AUTHENTICATION ROUTES ---
  app.post('/api/login', passport.authenticate('local'), (req: any, res) => {
    if (req.user) {
      logActivity({ userId: req.user.id, activityType: 'login' });
    }
    res.json(req.user);
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        // Redireciona para a página inicial após o logout
        res.redirect('/');
      });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      // Log activity to track app access/usage
      logActivity({ userId: (req.user as any).id, activityType: 'app_access' });
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Não autorizado" });
    }
  });
  
  app.put('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await storage.getUser(req.user.id);

        if (!user || !user.hashedPassword) {
            return res.status(401).json({ message: "Usuário não encontrado ou sem senha." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ message: "Senha atual incorreta." });
        }
        
        const newHashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await storage.updateUserPassword(req.user.id, newHashedPassword);

        res.status(200).json({ message: "Senha alterada com sucesso." });
    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        res.status(500).json({ message: "Falha ao alterar a senha." });
    }
  });

  app.put('/api/auth/profile', isAuthenticated, async (req: any, res) => {
      try {
          const updatedUser = await storage.updateUserProfile(req.user.id, req.body);
          res.json(updatedUser);
      } catch (error: any) {
          console.error("Erro ao atualizar perfil:", error);
          if (error.message?.includes('unique constraint')) {
              return res.status(409).json({ message: "Este email já está em uso." });
          }
          res.status(500).json({ message: "Falha ao atualizar o perfil." });
      }
  });

  app.put('/api/nutritionist/settings', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas nutricionistas." });
      }
      
      const { bodyFatEquation } = req.body;
      
      if (bodyFatEquation && !['siri', 'brozek'].includes(bodyFatEquation)) {
        return res.status(400).json({ message: "Equacao invalida. Use siri ou brozek." });
      }
      
      const updatedUser = await db.update(users)
        .set({ bodyFatEquation: bodyFatEquation || 'siri' })
        .where(eq(users.id, req.user.id))
        .returning();
      
      if (updatedUser.length === 0) {
        return res.status(404).json({ message: "Usuario nao encontrado." });
      }
      
      logActivity({ userId: req.user.id, activityType: 'update_settings', details: `Equacao de conversao alterada para: ${bodyFatEquation}` });
      res.json({ success: true, bodyFatEquation: updatedUser[0].bodyFatEquation });
    } catch (error: any) {
      console.error("Erro ao atualizar configuracoes:", error);
      res.status(500).json({ message: "Falha ao atualizar configuracoes." });
    }
  });

  app.get('/api/nutritionist/settings', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas nutricionistas." });
      }
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuario nao encontrado." });
      }
      
      res.json({ bodyFatEquation: user.bodyFatEquation || 'siri' });
    } catch (error: any) {
      console.error("Erro ao buscar configuracoes:", error);
      res.status(500).json({ message: "Falha ao buscar configuracoes." });
    }
  });

  // --- USER ROUTES ---
  app.get('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        const user = await storage.getUser(req.params.id);
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "Usuário não encontrado." });
        }
    } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        res.status(500).json({ message: "Falha ao buscar usuário." });
    }
  });

  // --- ADMIN ROUTES ---
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const users = await storage.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        res.status(500).json({ message: "Falha ao buscar usuários." });
    }
  });

  app.get('/api/admin/users/:id/dependencies', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const hasPatients = await storage.userHasPatients(id);
      const hasPrescriptions = await storage.userHasPrescriptions(id);
      const hasInvitations = await storage.userHasInvitations(id);
      
      const canDelete = !hasPatients && !hasPrescriptions;

      res.json({ hasPatients, hasPrescriptions, hasInvitations, canDelete });
    } catch (error) {
      console.error("Erro ao verificar dependências do usuário:", error);
      res.status(500).json({ message: "Falha ao verificar dependências." });
    }
  });

  app.post('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { email, password, firstName, lastName, role } = req.body;

        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: "Email já cadastrado." });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser = await storage.upsertUser({ email, hashedPassword, firstName, lastName, role });
        res.status(201).json(newUser);
    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        res.status(500).json({ message: "Falha ao criar usuário." });
    }
  });

  app.put('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
      try {
        const updatedUser = await storage.updateUserProfile(req.params.id, req.body);
        res.json(updatedUser);
      } catch (error: any) {
        console.error("Erro ao atualizar usuário:", error);
        if (error.message?.includes('unique constraint')) {
            return res.status(409).json({ message: "Este email já está em uso." });
        }
        res.status(500).json({ message: "Falha ao atualizar usuário." });
      }
  });

  app.put('/api/admin/users/:id/password', isAuthenticated, isAdmin, async (req, res) => {
      try {
          const { newPassword } = req.body;
          if (!newPassword || newPassword.length < 6) {
              return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
          }
          const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
          await storage.updateUserPassword(req.params.id, hashedPassword);
          res.status(200).json({ message: "Senha atualizada com sucesso." });
      } catch (error) {
          console.error("Erro ao alterar senha:", error);
          res.status(500).json({ message: "Falha ao alterar senha." });
      }
  });
  
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Erro ao deletar usuário:", error);
      if (error.message.includes("possui")) {
          return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Falha ao deletar usuário." });
    }
  });
  

  // --- PATIENT ROUTES ---
  app.post("/api/patient/register", async (req, res, next) => {
    try {
      const newUser = await storage.createPatientFromInvitation(req.body);
      
      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        res.status(201).json(newUser);
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
      }
      if (error.message?.includes("409")) {
        return res.status(409).json({ message: "Este email já está cadastrado." });
      }
      console.error("Erro ao registrar paciente:", error);
      res.status(400).json({ message: error.message || "Falha ao registrar paciente." });
    }
  });
  
  app.post('/api/patients', isAuthenticated, async (req: any, res) => {
    try {
      const patientData = insertPatientSchema.parse({
        ...req.body,
        ownerId: req.user.id,
      });

      const existingUser = await storage.getUserByEmail(patientData.email!);
      if(existingUser) {
        return res.status(409).json({ message: "Já existe um usuário com este email." });
      }
      
      const hashedPassword = await bcrypt.hash(req.body.password, SALT_ROUNDS);
      const newUser = await storage.upsertUser({
        email: patientData.email!,
        firstName: patientData.name.split(' ')[0],
        lastName: patientData.name.split(' ').slice(1).join(' '),
        hashedPassword,
        role: 'patient',
      });

      const newPatient = await storage.createPatient({ ...patientData, userId: newUser.id });

      res.status(201).json(newPatient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados do paciente inválidos.", errors: error.flatten() });
      }
      console.error("Erro ao criar paciente:", error);
      res.status(500).json({ message: "Falha ao criar paciente." });
    }
  });

  app.get('/api/patients', isAuthenticated, async (req: any, res) => {
    try {
      const patients = await storage.getPatientsByOwner(req.user.id);
      res.json(patients);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
      res.status(500).json({ message: "Falha ao buscar pacientes." });
    }
  });

  app.get('/api/patients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (patient && (req.user.role === 'admin' || patient.ownerId === req.user.id)) {
        res.json(patient);
      } else {
        res.status(404).json({ message: "Paciente não encontrado ou acesso não autorizado." });
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes do paciente:", error);
      res.status(500).json({ message: "Falha ao buscar detalhes do paciente." });
    }
  });

  app.put('/api/patients/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Valida os dados recebidos usando o novo schema
      const patientData = updatePatientSchema.parse(req.body);

      const patient = await storage.getPatient(req.params.id);
      
      // Garante que o nutricionista só possa editar seus próprios pacientes
      if (!patient || patient.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Paciente não encontrado ou acesso não autorizado." });
      }

      const updatedPatient = await storage.updatePatient(req.params.id, patientData);
      res.json(updatedPatient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados do paciente inválidos.", errors: error.flatten() });
      }
      console.error("Erro ao atualizar paciente:", error);
      res.status(500).json({ message: "Falha ao atualizar paciente." });
    }
  });

  app.delete('/api/patients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const nutritionistId = req.user.id;

      const patient = await storage.getPatient(id);
      
      if (!patient || patient.ownerId !== nutritionistId) {
        return res.status(404).json({ message: 'Paciente não encontrado' });
      }

      await db.transaction(async (tx) => {
        await tx.delete(anamnesisRecords).where(eq(anamnesisRecords.patientId, id));
        await tx.delete(foodDiaryEntries).where(eq(foodDiaryEntries.patientId, id));
        await tx.delete(prescriptions).where(eq(prescriptions.patientId, id));
        await tx.delete(patients).where(eq(patients.id, id));
      });

      return res.status(200).json({ message: 'Paciente excluído com sucesso' });
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
      res.status(500).json({ message: "Falha ao excluir paciente." });
    }
  });
  
  app.get('/api/patient/my-profile', isAuthenticated, async (req: any, res) => {
    try {
      // Adiciona headers de cache-control para garantir que dados sempre frescos sejam buscados
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Log activity to track when patient accesses their profile
      logActivity({ userId: req.user.id, activityType: 'view_profile' });
      
      const patientProfile = await storage.getPatientByUserId(req.user.id);
      if (patientProfile) {
        res.json(patientProfile);
      } else {
        res.status(404).json({ message: 'Perfil de paciente não encontrado.' });
      }
    } catch (error) {
      console.error("Erro ao buscar perfil do paciente:", error);
      res.status(500).json({ message: 'Falha ao buscar perfil do paciente.' });
    }
  });

  app.post('/api/patients/:id/request-follow-up', isAuthenticated, async (req: any, res) => {
    try {
      // Futuramente, podemos gerar um token único aqui. Por simplicidade,
      // por enquanto vamos apenas gerar uma URL simples.
      const patientId = req.params.id;
      const patient = await storage.getPatient(patientId);

      if (!patient || patient.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Paciente não encontrado." });
      }

      // Este link não é seguro por token, mas serve para o fluxo inicial.
      // Uma implementação robusta usaria um token de uso único.
      const followUpUrl = `${req.protocol}://${req.get('host')}/anamnese/retorno?patientId=${patientId}`;
      
      res.json({ followUpUrl });
    } catch (error) {
      console.error("Erro ao solicitar anamnese de retorno:", error);
      res.status(500).json({ message: "Falha ao gerar link." });
    }
  });

  app.post('/api/patients/:id/anamnesis-records', isAuthenticated, async (req: any, res) => {
    try {
        const patientId = req.params.id;
        // Apenas o próprio paciente (no futuro) ou o nutricionista dono podem adicionar um registro.
        const patient = await storage.getPatient(patientId);
        if (!patient || (req.user.role === 'nutritionist' && patient.ownerId !== req.user.id)) {
            return res.status(403).json({ message: "Acesso negado." });
        }

        const recordData = insertAnamnesisRecordSchema.parse({
            ...req.body,
            patientId: patientId,
        });
        const newRecord = await storage.createAnamnesisRecord(recordData);
        // Atualiza o peso mais recente na tabela principal do paciente para fácil acesso
        if (recordData.weightKg) {
            await storage.updatePatient(patientId, { weightKg: recordData.weightKg });
        }
        res.status(201).json(newRecord);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
        }
        console.error("Erro ao salvar anamnese de retorno:", error);
        res.status(500).json({ message: "Falha ao salvar anamnese de retorno." });
    }
  });

  app.get('/api/patients/:id/anamnesis-records', isAuthenticated, async (req: any, res) => {
    try {
        const patientId = req.params.id;
        const patient = await storage.getPatient(patientId);
        if (!patient || patient.ownerId !== req.user.id) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        const records = await storage.getAnamnesisRecords(patientId);
        res.json(records);
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        res.status(500).json({ message: "Falha ao buscar histórico de anamnese." });
    }
  });

  // --- PRESCRIPTION ROUTES ---
  app.post('/api/prescriptions', isAuthenticated, async (req: any, res) => {
    try {
      // Normaliza campos de data: o drizzle-zod v0.7.x espera objetos Date para campos
      // timestamp, mas o frontend envia strings ISO via JSON (ex: "2026-05-31T00:00:00.000Z").
      // Sem essa conversão, o Zod rejeita com erro 400 "expected date, received string".
      const body = { ...req.body };
      if (body.expiresAt && typeof body.expiresAt === 'string') {
        body.expiresAt = new Date(body.expiresAt);
      }
      if (body.publishedAt && typeof body.publishedAt === 'string') {
        body.publishedAt = new Date(body.publishedAt);
      }
      if (body.startDate && typeof body.startDate === 'string') {
        body.startDate = new Date(body.startDate);
      }
      const prescriptionData = insertPrescriptionSchema.parse({
        ...body,
        nutritionistId: req.user.id,
      });
      const newPrescription = await storage.createPrescription(prescriptionData);
      res.status(201).json(newPrescription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados da prescrição inválidos.", errors: error.flatten() });
      }
      console.error("Erro ao criar prescrição:", error);
      res.status(500).json({ message: "Falha ao criar prescrição." });
    }
  });

  app.get('/api/patients/:patientId/prescriptions', isAuthenticated, async (req, res) => {
    try {
      const prescriptions = await storage.getPrescriptionsByPatient(req.params.patientId);
      res.json(prescriptions);
    } catch (error) {
      console.error("Erro ao buscar prescrições:", error);
      res.status(500).json({ message: "Falha ao buscar prescrições." });
    }
  });
  
  app.get('/api/prescriptions/:id', isAuthenticated, async (req, res) => {
    try {
      const prescription = await storage.getPrescription(req.params.id);
      res.json(prescription);
    } catch (error) {
      console.error("Erro ao buscar prescrição:", error);
      res.status(500).json({ message: "Falha ao buscar prescrição." });
    }
  });

  app.put('/api/prescriptions/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Normaliza campos de data para objetos Date (o frontend envia strings ISO)
      const body = { ...req.body };
      if (body.expiresAt && typeof body.expiresAt === 'string') body.expiresAt = new Date(body.expiresAt);
      if (body.publishedAt && typeof body.publishedAt === 'string') body.publishedAt = new Date(body.publishedAt);
      if (body.startDate && typeof body.startDate === 'string') body.startDate = new Date(body.startDate);
      const prescriptionData = updatePrescriptionSchema.parse(body);
      const updatedPrescription = await storage.updatePrescription(req.params.id, prescriptionData);
      res.json(updatedPrescription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados da prescrição inválidos.", errors: error.flatten() });
      }
      console.error("Erro ao atualizar prescrição:", error);
      res.status(500).json({ message: "Falha ao atualizar prescrição." });
    }
  });
  
  app.post('/api/prescriptions/:id/publish', isAuthenticated, async (req, res) => {
    try {
      const prescription = await storage.publishPrescription(req.params.id);
      res.json(prescription);

      // Disparar notificações (push + in-app) para o paciente em background
      try {
        const patient = await storage.getPatient(prescription.patientId);
        if (patient?.userId) {
          const notifPayload = {
            title: 'Novo Plano Alimentar Disponível! 🥗',
            body: `Seu plano "${prescription.title}" foi disponibilizado pelo seu nutricionista.`,
            url: '/my-plan',
            type: 'plan' as const,
          };
          // Push (funciona apenas se o paciente autorizou)
          await sendPushToUser(patient.userId, notifPayload).catch((e) =>
            console.error('[PushNotifications] Erro ao enviar push de plano publicado:', e)
          );
          // In-app (sempre funciona, independente de permissão)
          await createInAppNotification(patient.userId, notifPayload);
        }
      } catch (notifErr) {
        console.error('[Notifications] Erro ao enviar notificações de plano publicado:', notifErr);
      }
    } catch (error) {
      console.error("Error publishing prescription:", error);
      res.status(500).json({ message: "Failed to publish prescription" });
    }
  });

  // Rota de ativação: muda status para "active" e define startDate = agora.
  // O expiresAt não é recalculado — usa o valor já definido pelo nutricionista via updatePrescription.
  app.post('/api/prescriptions/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const prescription = await storage.activatePrescription(req.params.id);
      logActivity({
        userId: req.user.id,
        activityType: 'activate_prescription',
        details: `Plano alimentar ativado: ${prescription.title}`,
      });
      res.json(prescription);
    } catch (error: any) {
      console.error('Error activating prescription:', error);
      res.status(500).json({ message: 'Failed to activate prescription' });
    }
  });

  // Rota de desativação: muda status para "preparing", removendo o acesso do paciente ao plano.
  app.post('/api/prescriptions/:id/deactivate', isAuthenticated, async (req: any, res) => {
    try {
      const prescription = await storage.deactivatePrescription(req.params.id);
      logActivity({
        userId: req.user.id,
        activityType: 'deactivate_prescription',
        details: `Plano alimentar desativado: ${prescription.title}`,
      });
      res.json(prescription);
    } catch (error: any) {
      console.error('Error deactivating prescription:', error);
      res.status(500).json({ message: 'Failed to deactivate prescription' });
    }
  });

  app.post('/api/prescriptions/:id/duplicate', isAuthenticated, async (req, res) => {
    try {
      const { title } = req.body;
      const prescription = await storage.duplicatePrescription(req.params.id, title);
      res.json(prescription);
    } catch (error) {
      console.error("Error duplicating prescription:", error);
      res.status(500).json({ message: "Failed to duplicate prescription" });
    }
  });

  app.post('/api/prescriptions/:id/duplicate-to-patient', isAuthenticated, async (req: any, res) => {
    try {
      const { targetPatientId, title } = req.body;
      
      // Verify that the source prescription belongs to the authenticated nutritionist
      const sourcePrescription = await storage.getPrescription(req.params.id);
      if (!sourcePrescription || sourcePrescription.nutritionistId !== req.user.id) {
        return res.status(403).json({ message: "Source prescription not found or access denied" });
      }
      
      // Verify that the target patient belongs to the authenticated nutritionist
      const targetPatient = await storage.getPatient(targetPatientId);
      if (!targetPatient || targetPatient.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Target patient not found or access denied" });
      }
      
      const prescription = await storage.duplicatePrescriptionToPatient(req.params.id, targetPatientId, title);
      res.json(prescription);
    } catch (error) {
      console.error("Error duplicating prescription to patient:", error);
      res.status(500).json({ message: "Failed to duplicate prescription to patient" });
    }
  });

  app.delete('/api/prescriptions/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deletePrescription(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes("403")) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete prescription" });
    }
  });

  app.get('/api/patient/my-prescriptions', isAuthenticated, async (req: any, res) => {
    try {
      // Adiciona headers de cache-control para garantir que dados sempre frescos sejam buscados
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      logActivity({ userId: req.user.id, activityType: 'view_my_prescriptions_list' });

      // Regra de negócio: a assinatura é a regra absoluta de acesso.
      // Se a assinatura estiver expirada ou inativa, o paciente não tem acesso ao plano alimentar.
      const patient = await storage.getPatientByUserId(req.user.id);
      if (patient) {
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.patientId, patient.id))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

        const hasActiveSubscription = subscription &&
          subscription.status === 'active' &&
          (!subscription.expiresAt || new Date(subscription.expiresAt) > new Date());

        if (!hasActiveSubscription) {
          return res.json([]);
        }
      }

      const prescriptionList = await storage.getPublishedPrescriptionsForUser(req.user.id);
      res.json(prescriptionList);
    } catch (error) {
      console.error("Error fetching patient prescriptions:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  // --- INVITATION ROUTES ---
  app.post('/api/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const invitation = await storage.createInvitation(req.user.id);
      res.json(invitation);
    } catch (error) {
      console.error("Erro ao criar convite:", error);
      res.status(500).json({ message: "Falha ao criar convite." });
    }
  });
  
  app.get('/api/invitations/validate', async (req, res) => {
    const { token } = req.query;
    if (typeof token !== 'string') {
      return res.status(400).json({ message: 'Token inválido.' });
    }
    const invitation = await storage.getInvitationByToken(token);
    if (invitation && invitation.status === 'pending') {
      res.status(200).json({ valid: true });
    } else {
      res.status(404).json({ message: 'Convite inválido ou expirado.' });
    }
  });

  // --- MOOD ROUTES ---
  app.post('/api/mood-entries', isAuthenticated, async (req: any, res) => {
    try {
      const patientProfile = await storage.getPatientByUserId(req.user.id);
      if (!patientProfile) {
        return res.status(403).json({ message: "Perfil de paciente não encontrado." });
      }
      const moodData = insertMoodEntrySchema.parse({
        ...req.body,
        patientId: patientProfile.id,
      });
      const newMoodEntry = await storage.createMoodEntry(moodData);
      res.status(201).json(newMoodEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados de humor inválidos.", errors: error.flatten() });
      }
      console.error("Erro ao criar registro de humor:", error);
      res.status(500).json({ message: "Falha ao criar registro de humor." });
    }
  });

  app.put('/api/mood-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const updateData = insertMoodEntrySchema.partial().parse(req.body);
      const moodEntry = await storage.updateMoodEntry(req.params.id, updateData);
      res.json(moodEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mood entry data.", errors: error.flatten() });
      }
      console.error("Error updating mood entry:", error);
      res.status(500).json({ message: "Failed to update mood entry" });
    }
  });

  app.get('/api/mood-entries/:prescriptionId/:mealId/:date', isAuthenticated, async (req, res) => {
    try {
      const { prescriptionId, mealId, date } = req.params;
      const moodEntry = await storage.getMoodEntry(prescriptionId, mealId, date);
      if (moodEntry) {
        res.json(moodEntry);
      } else {
        res.status(404).json({ message: 'Nenhum registro de humor encontrado para esta data.' });
      }
    } catch(error) {
      console.error("Error fetching mood entry:", error);
      res.status(500).json({ message: "Failed to fetch mood entry" });
    }
  });

  app.get('/api/patients/:patientId/mood-entries', isAuthenticated, async (req: any, res) => {
    try {
      const { patientId } = req.params;
      const { startDate, endDate } = req.query;
      
      const moodEntries = await storage.getMoodEntriesByPatient(
        patientId,
        startDate as string,
        endDate as string
      );
      
      res.json(moodEntries);
    } catch (error) {
      console.error("Error fetching mood entries for patient:", error);
      res.status(500).json({ message: "Failed to fetch mood entries" });
    }
  });

  app.get('/api/prescriptions/:prescriptionId/mood-entries', isAuthenticated, async (req: any, res) => {
    try {
      const { prescriptionId } = req.params;
      const moodEntries = await storage.getMoodEntriesByPrescription(prescriptionId);
      res.json(moodEntries);
    } catch (error) {
      console.error("Error fetching mood entries for prescription:", error);
      res.status(500).json({ message: "Failed to fetch mood entries" });
    }
  });

  // --- FOOD DIARY ROUTES ---
  app.post('/api/food-diary/upload', isAuthenticated, async (req: any, res) => {
    try {
        const body = req.body as HandleUploadBody;
    
        const jsonResponse = await handleUpload({
          body,
          request: req,
          onBeforeGenerateToken: async (pathname: string) => {
            const blobPath = `food-diary/${req.user.id}/${pathname}`;
            return {
              allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
              pathname: blobPath,
              tokenPayload: JSON.stringify({
                userId: req.user.id,
              }),
            };
          },
          onUploadCompleted: async ({ blob, tokenPayload }) => {
            console.log('blob upload completed', blob, tokenPayload);
          },
        });
    
        return res.status(200).json(jsonResponse);
      } catch (error) {
        console.error("Error in upload handler:", error);
        return res.status(400).json({ error: (error as Error).message });
      }
  });

  // New route for optimized image upload with server-side processing
  app.post('/api/food-diary/upload-optimized', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo de imagem fornecido' });
      }

      // Process the image with Sharp
      const processedImageBuffer = await sharp(req.file.buffer)
        .resize({ width: 1080 }) // Redimensiona para uma largura máxima de 1080px
        .webp({ quality: 80 }) // Converte para WebP com 80% de qualidade
        .toBuffer();

      // Generate unique filename
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
      const blobPath = `food-diary/${req.user.id}/${filename}`;

      // Upload processed image to Vercel Blob
      const blob = await put(blobPath, processedImageBuffer, {
        access: 'public',
        contentType: 'image/webp',
      });

      console.log('Imagem processada e enviada:', {
        originalSize: req.file.size,
        processedSize: processedImageBuffer.length,
        reduction: ((req.file.size - processedImageBuffer.length) / req.file.size * 100).toFixed(1) + '%'
      });

      return res.status(200).json({ url: blob.url });
    } catch (error) {
      console.error("Error in optimized upload handler:", error);
      return res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post('/api/food-diary/entries', isAuthenticated, async (req: any, res) => {
    try {
      // Log activity for food diary usage
      logActivity({ userId: req.user.id, activityType: 'create_food_diary_entry' });
      
      const patientProfile = await storage.getPatientByUserId(req.user.id);
      if (!patientProfile) {
        return res.status(403).json({ message: "Perfil de paciente não encontrado." });
      }
      
      const entryData = insertFoodDiaryEntrySchema.parse({
        ...req.body,
        patientId: patientProfile.id,
      });

      const newEntry = await storage.createFoodDiaryEntry(entryData);
      res.status(201).json(newEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("Error creating food diary entry:", error);
      res.status(500).json({ message: "Falha ao criar entrada no diário alimentar." });
    }
  });

  app.get('/api/patients/:patientId/food-diary/entries', isAuthenticated, async (req: any, res) => {
    try {
      // Adiciona headers de cache-control para garantir que dados sempre frescos sejam buscados
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const { patientId } = req.params;
      
      // Se for nutricionista, verifica se ele é dono do paciente
      // Se for o próprio paciente, permite o acesso
      const patient = await storage.getPatient(patientId);
      
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado." });
      }

      const isOwner = patient.ownerId === req.user.id;
      const isSelf = patient.userId === req.user.id;

      if (!isOwner && !isSelf) {
        return res.status(403).json({ message: "Acesso não autorizado." });
      }

      const entries = await storage.getFoodDiaryEntriesByPatient(patientId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching food diary entries:", error);
      res.status(500).json({ message: "Falha ao buscar entradas do diário alimentar." });
    }
  });

  // DELETE route to remove food diary entry and photo
  app.delete('/api/food-diary/entries/:id/photo', isAuthenticated, async (req: any, res) => {
    try {
      const entryId = req.params.id;
      const userId = req.user.id;

      // 1. Find the food diary entry and verify permission (nutritionist or patient)
      const entry = await db.query.foodDiaryEntries.findFirst({
        where: eq(foodDiaryEntries.id, entryId),
        with: {
          patient: true,
        },
      });

      if (!entry) {
        return res.status(404).json({ message: 'Entrada do diário não encontrada.' });
      }

      const isOwner = entry.patient.ownerId === userId;
      const isSelf = entry.patient.userId === userId;

      if (!isOwner && !isSelf) {
        return res.status(403).json({ message: 'Acesso não autorizado.' });
      }
      
      if (!entry.imageUrl) {
        return res.status(400).json({ message: 'Esta entrada não possui foto.' });
      }

      // 2. Delete the photo from Vercel Blob
      await deleteFoodDiaryPhoto(entry.imageUrl);

      // 3. Delete the entire diary entry from the database
      await db
        .delete(foodDiaryEntries)
        .where(eq(foodDiaryEntries.id, entryId));

      return res.status(200).json({ message: 'Entrada do diário excluída com sucesso.' });
    } catch (error) {
      console.error("Error deleting food diary entry:", error);
      res.status(500).json({ message: "Falha ao excluir a entrada do diário." });
    }
  });

  // PATCH route to update nutritionist-specific data for anamnesis records
  app.patch('/api/anamnesis/:anamnesisId/nutritionist-data', isAuthenticated, async (req: any, res) => {
    try {
      const nutritionistId = req.user.id; // Get the logged-in nutritionist's ID
      const anamnesisId = req.params.anamnesisId;
      const body = req.body;

      // Create a validation schema for only the nutritionist fields
      const nutritionistDataSchema = z.object({
        tmb: z.coerce.number().min(0, "TMB deve ser um valor positivo").optional().nullable(),
        get: z.coerce.number().min(0, "GET deve ser um valor positivo").optional().nullable(),
        vet: z.coerce.number().min(0, "VET deve ser um valor positivo").optional().nullable(),
        usedFormula: z.string().optional().nullable(),
        targetCarbPercent: z.coerce.number().min(0).max(100).optional().nullable(),
        targetProteinPercent: z.coerce.number().min(0).max(100).optional().nullable(),
        targetFatPercent: z.coerce.number().min(0).max(100).optional().nullable(),
        targetCarbG: z.coerce.number().min(0).optional().nullable(),
        targetProteinG: z.coerce.number().min(0).optional().nullable(),
        targetFatG: z.coerce.number().min(0).optional().nullable(),
      });

      // Validate the data
      const data = nutritionistDataSchema.parse(body);

      // Security check: verify that the anamnesis belongs to a patient owned by this nutritionist
      const [targetAnamnesis] = await db
        .select({ patientOwnerId: patients.ownerId })
        .from(anamnesisRecords)
        .leftJoin(patients, eq(anamnesisRecords.patientId, patients.id))
        .where(eq(anamnesisRecords.id, anamnesisId));

      if (!targetAnamnesis || targetAnamnesis.patientOwnerId !== nutritionistId) {
        return res.status(404).json({ error: "Anamnese não encontrada ou não autorizada." });
      }

      // Update the nutritionist data in the database
      const [updatedAnamnesis] = await db
        .update(anamnesisRecords)
        .set({
          tmb: data.tmb,
          get: data.get,
          vet: data.vet,
          usedFormula: data.usedFormula,
          targetCarbPercent: data.targetCarbPercent,
          targetProteinPercent: data.targetProteinPercent,
          targetFatPercent: data.targetFatPercent,
          targetCarbG: data.targetCarbG,
          targetProteinG: data.targetProteinG,
          targetFatG: data.targetFatG,
        })
        .where(eq(anamnesisRecords.id, anamnesisId))
        .returning();

      return res.json(updatedAnamnesis);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
      }
      console.error("Erro ao atualizar dados do nutricionista:", error);
      res.status(500).json({ message: "Falha ao atualizar dados do nutricionista." });
    }
  });

  // --- SUBSCRIPTION MANAGEMENT ROUTES ---
  
  // Get patient's current subscription
  app.get('/api/patients/:patientId/subscription', isAuthenticated, async (req: any, res) => {
    try {
      // Adiciona headers de cache-control para garantir que dados sempre frescos sejam buscados
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const patientId = req.params.patientId;
      const userId = req.user.id;
      
      // Security check: ensure user can access this patient's data
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId));

      if (!patient) {
        return res.status(404).json({ error: "Paciente não encontrado." });
      }

      // Check if user is the patient themselves or their nutritionist
      if (req.user.role === 'patient' && patient.userId !== userId) {
        return res.status(403).json({ error: "Acesso não autorizado." });
      }
      if (req.user.role === 'nutritionist' && patient.ownerId !== userId) {
        return res.status(403).json({ error: "Acesso não autorizado." });
      }

      // Log activity when patient checks their subscription (indicates app usage)
      if (req.user.role === 'patient') {
        logActivity({ userId: req.user.id, activityType: 'view_subscription' });
      }

      // Get the most recent subscription
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.patientId, patientId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (!subscription) {
        return res.status(404).json({ error: "Nenhum plano encontrado." });
      }

      return res.json(subscription);
    } catch (error) {
      console.error("Erro ao buscar assinatura:", error);
      res.status(500).json({ error: "Falha ao buscar plano." });
    }
  });

  // Patient requests plan renewal
  app.post('/api/patients/:patientId/subscription/renew', isAuthenticated, async (req: any, res) => {
    try {
      const patientId = req.params.patientId;
      const userId = req.user.id;
      const { planType } = req.body;

      // Security check: ensure user is the patient themselves
      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, patientId));

      if (!patient) {
        return res.status(404).json({ error: "Paciente não encontrado." });
      }

      if (req.user.role === 'patient' && patient.userId !== userId) {
        return res.status(403).json({ error: "Acesso não autorizado." });
      }

      // Validate plan type
      if (!['monthly', 'quarterly'].includes(planType)) {
        return res.status(400).json({ error: "Tipo de plano inválido." });
      }

      // Create new subscription with pending payment status
      const subscriptionId = nanoid();
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          id: subscriptionId,
          patientId,
          planType,
          status: 'pending_payment',
          // Temporary dates, will be updated on approval
          startDate: new Date(),
          expiresAt: new Date(Date.now() + (planType === 'monthly' ? 30 : 90) * 24 * 60 * 60 * 1000),
        })
        .returning();

      return res.status(201).json(newSubscription);
    } catch (error) {
      console.error("Erro ao solicitar renovação:", error);
      res.status(500).json({ error: "Falha ao solicitar renovação." });
    }
  });

  // Nutritionist creates a subscription for a patient
  app.post('/api/nutritionist/patients/:patientId/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const nutritionistId = req.user.id;
      const patientId = req.params.patientId;
      const { planType, status = 'active', expiresAt } = req.body;

      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ error: 'Acesso negado. Apenas nutricionistas.' });
      }

      // Validate plan type
      if (!['free', 'monthly', 'quarterly'].includes(planType)) {
        return res.status(400).json({ error: 'Tipo de plano inválido' });
      }

      // Validate status
      if (!['active', 'pending_payment', 'pending_approval'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
      }

      // Security check: ensure patient belongs to this nutritionist
      const [patient] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.id, patientId), eq(patients.ownerId, nutritionistId)));

      if (!patient) {
        return res.status(404).json({ error: 'Paciente não encontrado ou acesso negado' });
      }

      // Calculate dates based on plan type and status
      const now = new Date();
      let startDate = now;
      let expirationDate = null;

      if (status === 'active') {
        if (planType === 'free') {
          // Free plans don't expire
          expirationDate = null;
        } else if (expiresAt) {
          // Use custom expiration date if provided
          // Handle date input strings properly to avoid timezone issues
          if (typeof expiresAt === 'string' && expiresAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // This is a date string from HTML date input (YYYY-MM-DD)
            // Create date at noon UTC to avoid timezone shifts
            const [year, month, day] = expiresAt.split('-').map(Number);
            expirationDate = new Date(year, month - 1, day, 12, 0, 0, 0);
          } else {
            expirationDate = new Date(expiresAt);
          }
          // Validate that the custom date is in the future
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (expirationDate <= todayStart) {
            return res.status(400).json({ error: 'Data de expiração deve ser no futuro' });
          }
        } else {
          // Auto-calculate expiration based on plan type
          if (planType === 'monthly') {
            expirationDate = new Date(now);
            expirationDate.setMonth(expirationDate.getMonth() + 1);
          } else if (planType === 'quarterly') {
            expirationDate = new Date(now);
            expirationDate.setMonth(expirationDate.getMonth() + 3);
          }
        }
      }

      // Create new subscription
      const subscriptionId = nanoid();
      await db
        .insert(subscriptions)
        .values({
          id: subscriptionId,
          patientId: patientId,
          planType: planType,
          status: status,
          startDate: startDate,
          expiresAt: expirationDate,
          createdAt: now,
          updatedAt: now
        });

      const [newSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId));

      return res.json(newSubscription);
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      return res.status(500).json({ error: 'Falha ao criar assinatura' });
    }
  });

  // Nutritionist gets all pending subscriptions for their patients
  app.get('/api/nutritionist/subscriptions/pending', isAuthenticated, async (req: any, res) => {
    try {
      const nutritionistId = req.user.id;

      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ error: "Acesso negado. Apenas nutricionistas." });
      }

      // Get pending subscriptions for nutritionist's patients
      const pendingSubscriptions = await db
        .select({
          subscription: subscriptions,
          patient: { id: patients.id, name: patients.name, email: patients.email },
        })
        .from(subscriptions)
        .leftJoin(patients, eq(subscriptions.patientId, patients.id))
        .where(
          and(
            eq(patients.ownerId, nutritionistId),
            or(
              eq(subscriptions.status, 'pending_payment'),
              eq(subscriptions.status, 'pending_approval')
            )
          )
        )
        .orderBy(desc(subscriptions.updatedAt));

      return res.json(pendingSubscriptions);
    } catch (error) {
      console.error("Erro ao buscar assinaturas pendentes:", error);
      res.status(500).json({ error: "Falha ao buscar assinaturas pendentes." });
    }
  });

  // Nutritionist manages a subscription (approve, reject, etc.)
  app.patch('/api/subscriptions/:subscriptionId/manage', isAuthenticated, async (req: any, res) => {
    try {
      const subscriptionId = req.params.subscriptionId;
      const nutritionistId = req.user.id;
      const { planType, status, expiresAt, ...otherData } = req.body;

      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ error: "Acesso negado. Apenas nutricionistas." });
      }

      // Security check: ensure subscription belongs to nutritionist's patient
      const [subscriptionWithPatient] = await db
        .select({
          subscription: subscriptions,
          patient: patients,
        })
        .from(subscriptions)
        .leftJoin(patients, eq(subscriptions.patientId, patients.id))
        .where(eq(subscriptions.id, subscriptionId));

      if (!subscriptionWithPatient || subscriptionWithPatient.patient?.ownerId !== nutritionistId) {
        return res.status(404).json({ error: "Assinatura não encontrada ou não autorizada." });
      }

      // Prepare update data with proper type handling
      const updateData: any = {
        ...otherData,
        updatedAt: new Date(),
      };

      // Handle planType if provided
      if (planType !== undefined) {
        updateData.planType = planType;
      }

      // Handle status if provided  
      if (status !== undefined) {
        updateData.status = status;
      }

      // Handle expiresAt with proper validation and conversion
      if (expiresAt !== undefined) {
        if (expiresAt === '' || expiresAt === null) {
          // Empty string or null means no expiration (for free plans)
          updateData.expiresAt = null;
        } else {
          // Convert string to Date and validate it's in the future
          let expirationDate;
          
          if (typeof expiresAt === 'string' && expiresAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // This is a date string from HTML date input (YYYY-MM-DD)
            // Create date at noon UTC to avoid timezone shifts
            const [year, month, day] = expiresAt.split('-').map(Number);
            expirationDate = new Date(year, month - 1, day, 12, 0, 0, 0);
          } else {
            expirationDate = new Date(expiresAt);
          }
          
          if (isNaN(expirationDate.getTime())) {
            return res.status(400).json({ error: "Data de expiração inválida." });
          }
          
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          if (expirationDate < todayStart) {
            return res.status(400).json({ error: "Data de expiração deve ser no futuro." });
          }
          updateData.expiresAt = expirationDate;
        }
      }

      // Update subscription
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set(updateData)
        .where(eq(subscriptions.id, subscriptionId))
        .returning();

      return res.json(updatedSubscription);
    } catch (error) {
      console.error("Erro ao gerenciar assinatura:", error);
      res.status(500).json({ error: "Falha ao gerenciar assinatura." });
    }
  });

  // Upload proof of payment (simplified - associates URL with subscription)
  app.post('/api/subscriptions/:subscriptionId/upload-proof', isAuthenticated, async (req: any, res) => {
    try {
      const subscriptionId = req.params.subscriptionId;
      const userId = req.user.id;
      const { proofUrl } = req.body;

      // Security check: ensure user owns this subscription
      const [subscriptionWithPatient] = await db
        .select({
          subscription: subscriptions,
          patient: patients,
        })
        .from(subscriptions)
        .leftJoin(patients, eq(subscriptions.patientId, patients.id))
        .where(eq(subscriptions.id, subscriptionId));

      if (!subscriptionWithPatient) {
        return res.status(404).json({ error: "Assinatura não encontrada." });
      }

      // Check if user is the patient or their nutritionist
      if (req.user.role === 'patient' && subscriptionWithPatient.patient?.userId !== userId) {
        return res.status(403).json({ error: "Acesso não autorizado." });
      }
      if (req.user.role === 'nutritionist' && subscriptionWithPatient.patient?.ownerId !== userId) {
        return res.status(403).json({ error: "Acesso não autorizado." });
      }

      // Update subscription with proof of payment
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({
          proofOfPaymentUrl: proofUrl,
          status: 'pending_approval',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscriptionId))
        .returning();

      return res.json(updatedSubscription);
    } catch (error) {
      console.error("Erro ao enviar comprovante:", error);
      res.status(500).json({ error: "Falha ao enviar comprovante." });
    }
  });

  // Delete/Cancel subscription (nutritionist only)
  app.delete('/api/subscriptions/:subscriptionId', isAuthenticated, async (req: any, res) => {
    try {
      const subscriptionId = req.params.subscriptionId;
      const nutritionistId = req.user.id;

      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ error: "Acesso negado. Apenas nutricionistas." });
      }

      // Security check: ensure subscription belongs to nutritionist's patient
      const [subscriptionWithPatient] = await db
        .select({
          subscription: subscriptions,
          patient: patients,
        })
        .from(subscriptions)
        .leftJoin(patients, eq(subscriptions.patientId, patients.id))
        .where(eq(subscriptions.id, subscriptionId));

      if (!subscriptionWithPatient || subscriptionWithPatient.patient?.ownerId !== nutritionistId) {
        return res.status(404).json({ error: "Assinatura não encontrada ou não autorizada." });
      }

      // Delete subscription
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.id, subscriptionId));

      return res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir assinatura:", error);
      res.status(500).json({ error: "Falha ao excluir assinatura." });
    }
  });

  // --- REPORTS ROUTES ---
  app.get('/api/nutritionist/reports/access-log', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ error: "Acesso negado. Apenas nutricionistas." });
      }

      const nutritionistId = req.user.id;

      // 1. Busca todos os pacientes do nutricionista usando uma abordagem mais simples
      const patientsOfNutritionist = await db
        .select({
          id: patients.id,
          name: patients.name,
          userId: patients.userId,
          userEmail: users.email
        })
        .from(patients)
        .leftJoin(users, eq(patients.userId, users.id))
        .where(eq(patients.ownerId, nutritionistId));

      // 2. Busca assinaturas e atividades em batch (evita N+1 queries)
      //    Antes: 2 queries por paciente (O(n) queries no total)
      //    Agora: 2 queries totais independente do número de pacientes

      const validPatients = patientsOfNutritionist.filter(p => p.id && p.name);
      const patientIds = validPatients.map(p => p.id);
      const userIds = validPatients.map(p => p.userId).filter(Boolean) as string[];

      // Busca a assinatura mais recente de cada paciente em uma única query
      // usando DISTINCT ON (PostgreSQL) via subquery com ROW_NUMBER
      const allSubscriptions = patientIds.length > 0
        ? await db
            .select()
            .from(subscriptions)
            .where(inArray(subscriptions.patientId, patientIds))
            .orderBy(subscriptions.patientId, desc(subscriptions.createdAt))
        : [];

      // Mapa: patientId -> assinatura mais recente
      const subscriptionByPatient = new Map<string, typeof allSubscriptions[0]>();
      for (const sub of allSubscriptions) {
        if (!subscriptionByPatient.has(sub.patientId)) {
          subscriptionByPatient.set(sub.patientId, sub);
        }
      }

      // Busca a última atividade de cada usuário em uma única query
      const allActivities = userIds.length > 0
        ? await db
            .select()
            .from(activityLog)
            .where(inArray(activityLog.userId, userIds))
            .orderBy(activityLog.userId, desc(activityLog.createdAt))
        : [];

      // Mapa: userId -> última atividade
      const activityByUser = new Map<string, typeof allActivities[0]>();
      for (const activity of allActivities) {
        if (!activityByUser.has(activity.userId)) {
          activityByUser.set(activity.userId, activity);
        }
      }

      const reportData = validPatients.map(patient => {
        const latestSubscription = subscriptionByPatient.get(patient.id) || null;
        const latestActivity = patient.userId ? activityByUser.get(patient.userId) || null : null;
        return {
          patientId: patient.id,
          patientName: patient.name || 'N/A',
          patientEmail: patient.userEmail || 'N/A',
          planType: latestSubscription?.planType || 'Nenhum',
          planStatus: latestSubscription?.status || 'Nenhum',
          planExpiresAt: latestSubscription?.expiresAt || null,
          lastActivityTimestamp: latestActivity?.createdAt || null,
          lastActivityType: latestActivity?.activityType || 'Nenhuma atividade',
        };
      });

      // 3. Criação do arquivo Excel (lógica existente, sem alterações)
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Relatório de Acesso');

      worksheet.columns = [
        { header: 'ID do Paciente', key: 'patientId', width: 25 },
        { header: 'Nome do Paciente', key: 'patientName', width: 30 },
        { header: 'Email', key: 'patientEmail', width: 30 },
        { header: 'Plano', key: 'planType', width: 15 },
        { header: 'Status do Plano', key: 'planStatus', width: 20 },
        { header: 'Vencimento', key: 'planExpiresAt', width: 20 },
        { header: 'Último Acesso', key: 'lastActivityTimestamp', width: 25 },
        { header: 'Última Atividade', key: 'lastActivityType', width: 40 },
      ];
      
      worksheet.getRow(1).font = { bold: true };

      reportData.forEach(data => {
        worksheet.addRow({
          ...data,
          planExpiresAt: formatDateInBrazilTimezone(data.planExpiresAt),
          lastActivityTimestamp: data.lastActivityTimestamp
            ? formatDateInBrazilTimezone(data.lastActivityTimestamp, true)
            : 'Nenhum acesso',
        });
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio_de_acesso.xlsx"');

      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);

    } catch (error) {
      console.error("Erro ao gerar relatório de acesso:", error);
      res.status(500).json({ message: "Falha ao gerar relatório." });
    }
  });

  // --- PATIENT DOCUMENT (ASSESSMENT) ROUTES ---

  // POST: Nutritionist uploads an assessment document for a patient
  app.post('/api/patients/:patientId/assessments', isAuthenticated, uploadDocument.single('file'), async (req: any, res) => {
    try {
      console.log(`[Upload] POST /api/patients/${req.params.patientId}/assessments - user: ${req.user?.id}, role: ${req.user?.role}`);
      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ message: "Acesso negado. Apenas nutricionistas." });
      }
      if (!req.file) {
        console.error("[Upload] req.file is undefined — multer did not receive a file. Check Content-Type header and FormData key.");
        return res.status(400).json({ message: "Nenhum arquivo enviado." });
      }
      const safeFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      console.log(`[Upload] File received: name=${safeFileName}, size=${req.file.size}, mimetype=${req.file.mimetype}`);

      const patientId = req.params.patientId;
      const patient = await storage.getPatient(patientId);
      if (!patient || patient.ownerId !== req.user.id) {
        console.error(`[Upload] Patient not found or access denied: patientId=${patientId}, ownerId=${patient?.ownerId}, userId=${req.user.id}`);
        return res.status(404).json({ message: "Paciente não encontrado ou acesso não autorizado." });
      }

      // Upload to Vercel Blob
      const ext = safeFileName.split('.').pop() || 'bin';
      const blobPath = `assessments/${patientId}/${nanoid()}.${ext}`;
      console.log(`[Upload] Uploading to Vercel Blob: ${blobPath}`);
      const blob = await put(blobPath, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
        addRandomSuffix: true,
        cacheControlMaxAge: 31536000,
      });
      console.log(`[Upload] Blob upload successful: ${blob.url}`);

      // Save record to database
      const docId = nanoid();
      console.log(`[Upload] Inserting into patient_documents: id=${docId}`);
      const [newDoc] = await db.insert(patientDocuments).values({
        id: docId,
        patientId,
        nutritionistId: req.user.id,
        fileName: safeFileName,
        fileUrl: blob.url,
      }).returning();
      console.log(`[Upload] Document saved successfully: ${newDoc.id}`);

      // Disparar notificações (push + in-app) para o paciente em background
      res.status(201).json(newDoc);
      try {
        if (patient.userId) {
          const assessmentPayload = {
            title: 'Relatório de Avaliação Disponível! 📊',
            body: `Um novo documento de avaliação (${safeFileName}) foi disponibilizado pelo seu nutricionista.`,
            url: '/assessments?tab=reports',
            type: 'assessment' as const,
          };
          // Push (funciona apenas se o paciente autorizou)
          await sendPushToUser(patient.userId, assessmentPayload).catch((e) =>
            console.error('[PushNotifications] Erro ao enviar push de avaliação:', e)
          );
          // In-app (sempre funciona, independente de permissão)
          await createInAppNotification(patient.userId, assessmentPayload);
        }
      } catch (notifErr) {
        console.error('[Notifications] Erro ao enviar notificações de avaliação:', notifErr);
      }
      return;
    } catch (error) {
      console.error("[Upload] Erro ao enviar avaliação:", error);
      res.status(500).json({ message: "Falha ao enviar avaliação." });
    }
  });

  // GET: Nutritionist lists assessments for a specific patient
  app.get('/api/patients/:patientId/assessments', isAuthenticated, async (req: any, res) => {
    try {
      const patientId = req.params.patientId;
      const patient = await storage.getPatient(patientId);
      if (!patient || patient.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Paciente não encontrado ou acesso não autorizado." });
      }

      const docs = await db
        .select()
        .from(patientDocuments)
        .where(eq(patientDocuments.patientId, patientId))
        .orderBy(desc(patientDocuments.createdAt));

      return res.json(docs);
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
      res.status(500).json({ message: "Falha ao buscar avaliações." });
    }
  });

  // GET: Patient lists their own assessments
  app.get('/api/my-assessments', isAuthenticated, async (req: any, res) => {
    try {
      // Adiciona headers de cache-control para garantir que dados sempre frescos sejam buscados
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const patientProfile = await storage.getPatientByUserId(req.user.id);
      if (!patientProfile) {
        return res.status(404).json({ message: "Perfil de paciente não encontrado." });
      }

      const docs = await db
        .select()
        .from(patientDocuments)
        .where(eq(patientDocuments.patientId, patientProfile.id))
        .orderBy(desc(patientDocuments.createdAt));

      return res.json(docs);
    } catch (error) {
      console.error("Erro ao buscar avaliações do paciente:", error);
      res.status(500).json({ message: "Falha ao buscar avaliações." });
    }
  });

  // DELETE: Nutritionist deletes an assessment document
  app.delete('/api/assessments/:documentId', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ message: "Acesso negado. Apenas nutricionistas." });
      }

      const [doc] = await db
        .select()
        .from(patientDocuments)
        .where(and(eq(patientDocuments.id, req.params.documentId), eq(patientDocuments.nutritionistId, req.user.id)));

      if (!doc) {
        return res.status(404).json({ message: "Documento não encontrado ou acesso não autorizado." });
      }

      await db.delete(patientDocuments).where(eq(patientDocuments.id, req.params.documentId));
      return res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir avaliação:", error);
      res.status(500).json({ message: "Falha ao excluir avaliação." });
    }
  });

  // --- ANTHROPOMETRIC ASSESSMENTS ROUTES ---

  // GET: List all anthropometric assessments for a patient
  app.get('/api/patients/:patientId/anthropometry', isAuthenticated, async (req: any, res) => {
    try {
      const { patientId } = req.params;
      const patient = await storage.getPatient(patientId);
      if (!patient || (req.user.role === 'nutritionist' && patient.ownerId !== req.user.id)) {
        return res.status(404).json({ message: "Paciente não encontrado ou acesso não autorizado." });
      }
      const assessments = await db
        .select()
        .from(anthropometricAssessments)
        .where(eq(anthropometricAssessments.patientId, patientId))
        .orderBy(desc(anthropometricAssessments.createdAt));
      return res.json(assessments);
    } catch (error) {
      console.error("Erro ao buscar avaliações antropométricas:", error);
      res.status(500).json({ message: "Falha ao buscar avaliações antropométricas." });
    }
  });

  // POST: Create a new anthropometric assessment
  app.post('/api/patients/:patientId/anthropometry', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ message: "Acesso negado. Apenas nutricionistas." });
      }
      const { patientId } = req.params;
      const patient = await storage.getPatient(patientId);
      if (!patient || patient.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Paciente não encontrado ou acesso não autorizado." });
      }
      const parsed = insertAnthropometricAssessmentSchema.safeParse({ ...req.body, patientId, nutritionistId: req.user.id });
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos.", errors: parsed.error.errors });
      }
      const [assessment] = await db
        .insert(anthropometricAssessments)
        .values({ id: nanoid(), ...parsed.data })
        .returning();
      return res.status(201).json(assessment);
    } catch (error) {
      console.error("Erro ao criar avaliação antropométrica:", error);
      res.status(500).json({ message: "Falha ao criar avaliação antropométrica." });
    }
  });

  // PUT: Update an anthropometric assessment
  app.put('/api/anthropometry/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ message: "Acesso negado. Apenas nutricionistas." });
      }
      const [existing] = await db
        .select()
        .from(anthropometricAssessments)
        .where(and(eq(anthropometricAssessments.id, req.params.id), eq(anthropometricAssessments.nutritionistId, req.user.id)));
      if (!existing) {
        return res.status(404).json({ message: "Avaliação não encontrada ou acesso não autorizado." });
      }
      const parsed = updateAnthropometricAssessmentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados inválidos.", errors: parsed.error.errors });
      }
      const [updated] = await db
        .update(anthropometricAssessments)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(anthropometricAssessments.id, req.params.id))
        .returning();
      return res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar avaliação antropométrica:", error);
      res.status(500).json({ message: "Falha ao atualizar avaliação antropométrica." });
    }
  });

  // DELETE: Delete an anthropometric assessment
  app.delete('/api/anthropometry/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ message: "Acesso negado. Apenas nutricionistas." });
      }
      const [existing] = await db
        .select()
        .from(anthropometricAssessments)
        .where(and(eq(anthropometricAssessments.id, req.params.id), eq(anthropometricAssessments.nutritionistId, req.user.id)));
      if (!existing) {
        return res.status(404).json({ message: "Avaliação não encontrada ou acesso não autorizado." });
      }
      await db.delete(anthropometricAssessments).where(eq(anthropometricAssessments.id, req.params.id));
      return res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir avaliação antropométrica:", error);
      res.status(500).json({ message: "Falha ao excluir avaliação antropométrica." });
    }
  });

  // ─── PUSH NOTIFICATIONS ROUTES ─────────────────────────────────────────────

  // GET: Retorna a chave pública VAPID para o frontend criar assinaturas
  app.get('/api/push/vapid-public-key', (req, res) => {
    const key = getVapidPublicKey();
    if (!key) {
      return res.status(503).json({ message: 'Notificações push não configuradas no servidor.' });
    }
    res.json({ publicKey: key });
  });

  // POST: Paciente registra sua assinatura push
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: 'Dados de assinatura inválidos.' });
      }

      // Verificar se já existe assinatura com esse endpoint para esse usuário
      const [existing] = await db
        .select()
        .from(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, req.user.id), eq(pushSubscriptions.endpoint, endpoint)));

      if (existing) {
        // Atualizar chaves (podem ter mudado)
        await db
          .update(pushSubscriptions)
          .set({ p256dh: keys.p256dh, auth: keys.auth, updatedAt: new Date() })
          .where(eq(pushSubscriptions.id, existing.id));
        return res.json({ message: 'Assinatura atualizada com sucesso.' });
      }

      // Criar nova assinatura
      await db.insert(pushSubscriptions).values({
        id: nanoid(),
        userId: req.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      return res.status(201).json({ message: 'Assinatura criada com sucesso.' });
    } catch (error) {
      console.error('[PushNotifications] Erro ao registrar assinatura:', error);
      res.status(500).json({ message: 'Falha ao registrar assinatura push.' });
    }
  });

  // DELETE: Paciente cancela sua assinatura push
  app.delete('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) {
        await db
          .delete(pushSubscriptions)
          .where(and(eq(pushSubscriptions.userId, req.user.id), eq(pushSubscriptions.endpoint, endpoint)));
      } else {
        // Remover todas as assinaturas do usuário
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, req.user.id));
      }
      return res.status(204).send();
    } catch (error) {
      console.error('[PushNotifications] Erro ao cancelar assinatura:', error);
      res.status(500).json({ message: 'Falha ao cancelar assinatura push.' });
    }
  });

  // POST: Nutricionista envia mensagem personalizada (para um paciente ou para todos)
  app.post('/api/push/send-message', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas nutricionistas.' });
      }

      const { title, body, targetUserId, targetUserIds } = req.body;
      if (!title || !body) {
        return res.status(400).json({ message: 'Título e mensagem são obrigatórios.' });
      }

      const payload = { title, body, type: 'message' as const };
      let totalSent = 0;
      let inAppCount = 0;

      const userIdsToSend = targetUserIds || (targetUserId ? [targetUserId] : null);

      if (userIdsToSend && Array.isArray(userIdsToSend)) {
        // Enviar para um ou mais pacientes específicos
        // Verificar se os pacientes pertencem ao nutricionista
        const validPatients = await db
          .select({ userId: patients.userId })
          .from(patients)
          .where(
            and(
              inArray(patients.userId, userIdsToSend.filter(id => !!id) as string[]),
              eq(patients.ownerId, req.user.id)
            )
          );

        const validUserIds = validPatients
          .map(p => p.userId)
          .filter((id): id is string => !!id);

        if (validUserIds.length === 0) {
          return res.status(404).json({ message: 'Nenhum paciente válido encontrado para envio.' });
        }

        for (const userId of validUserIds) {
          // Push (funciona apenas se o paciente autorizou)
          const sent = await sendPushToUser(userId, payload);
          totalSent += sent;
          // In-app (sempre funciona, independente de permissão)
          await createInAppNotification(userId, payload);
          inAppCount++;
        }
      } else {
        // Enviar para todos os pacientes do nutricionista
        // Push (funciona apenas se o paciente autorizou)
        totalSent = await sendPushToAllPatients(req.user.id, payload);
        // In-app (sempre funciona, independente de permissão)
        inAppCount = await createInAppNotificationForAllPatients(req.user.id, payload);
      }

      return res.json({
        message: `Notificação enviada com sucesso.`,
        sent: totalSent,
        inApp: inAppCount,
      });
    } catch (error) {
      console.error('[PushNotifications] Erro ao enviar mensagem:', error);
      res.status(500).json({ message: 'Falha ao enviar notificação.' });
    }
  });

  // GET: Relatório de mensagens lidas para o nutricionista
  app.get('/api/nutritionist/reports/messages-read', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas nutricionistas.' });
      }

      const nutritionistId = req.user.id;

      // 1. Busca todos os pacientes do nutricionista
      const nutritionistPatients = await db
        .select({
          id: patients.id,
          name: patients.name,
          email: patients.email,
          userId: patients.userId,
        })
        .from(patients)
        .where(eq(patients.ownerId, nutritionistId));

      const patientUserIds = nutritionistPatients
        .map((patient) => patient.userId)
        .filter((userId): userId is string => Boolean(userId));

      // Se não há pacientes com app, retorna vazio
      if (patientUserIds.length === 0) {
        return res.json({
          totals: {
            totalMessages: 0,
            readMessages: 0,
            unreadMessages: 0,
          },
          report: [],
        });
      }

      // 2. Busca todas as mensagens (notificações do tipo 'message') dos pacientes
      const allMessages = await db
        .select({
          id: inAppNotifications.id,
          userId: inAppNotifications.userId,
          title: inAppNotifications.title,
          body: inAppNotifications.body,
          type: inAppNotifications.type,
          isRead: inAppNotifications.isRead,
          createdAt: inAppNotifications.createdAt,
        })
        .from(inAppNotifications)
        .where(
          and(
            inArray(inAppNotifications.userId, patientUserIds),
            eq(inAppNotifications.type, 'message')
          )
        )
        .orderBy(desc(inAppNotifications.createdAt));

      // 3. Monta o relatório combinando dados de pacientes e mensagens
      const reportData: any[] = [];

      for (const message of allMessages) {
        const patient = nutritionistPatients.find((p) => p.userId === message.userId);
        if (patient) {
          reportData.push({
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email,
            messageTitle: message.title,
            messageBody: message.body,
            messageType: message.type,
            isRead: message.isRead,
            createdAt: message.createdAt,
          });
        }
      }

      // 4. Calcula totais
      const totals = {
        totalMessages: reportData.length,
        readMessages: reportData.filter((m) => m.isRead).length,
        unreadMessages: reportData.filter((m) => !m.isRead).length,
      };

      return res.json({
        totals,
        report: reportData,
      });
    } catch (error) {
      console.error('[MessagesReadReport] Erro ao gerar relatório:', error);
      res.status(500).json({ message: 'Falha ao gerar relatório de mensagens.' });
    }
  });

  // GET: Exportar relatório de mensagens lidas em Excel
  app.get('/api/nutritionist/reports/messages-read/export', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas nutricionistas.' });
      }

      const nutritionistId = req.user.id;

      // 1. Busca todos os pacientes do nutricionista
      const nutritionistPatients = await db
        .select({
          id: patients.id,
          name: patients.name,
          email: patients.email,
          userId: patients.userId,
        })
        .from(patients)
        .where(eq(patients.ownerId, nutritionistId));

      const patientUserIds = nutritionistPatients
        .map((patient) => patient.userId)
        .filter((userId): userId is string => Boolean(userId));

      // Se não há pacientes com app, retorna arquivo vazio
      if (patientUserIds.length === 0) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Mensagens Lidas');
        worksheet.columns = [
          { header: 'ID do Paciente', key: 'patientId', width: 25 },
          { header: 'Nome do Paciente', key: 'patientName', width: 30 },
          { header: 'Email do Paciente', key: 'patientEmail', width: 30 },
          { header: 'Título da Mensagem', key: 'messageTitle', width: 40 },
          { header: 'Corpo da Mensagem', key: 'messageBody', width: 60 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Data e Hora', key: 'createdAt', width: 25 },
        ];
        worksheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="relatorio_mensagens_lidas.xlsx"');

        const buffer = await workbook.xlsx.writeBuffer();
        return res.send(buffer);
      }

      // 2. Busca todas as mensagens dos pacientes
      const allMessages = await db
        .select({
          id: inAppNotifications.id,
          userId: inAppNotifications.userId,
          title: inAppNotifications.title,
          body: inAppNotifications.body,
          type: inAppNotifications.type,
          isRead: inAppNotifications.isRead,
          createdAt: inAppNotifications.createdAt,
        })
        .from(inAppNotifications)
        .where(
          and(
            inArray(inAppNotifications.userId, patientUserIds),
            eq(inAppNotifications.type, 'message')
          )
        )
        .orderBy(desc(inAppNotifications.createdAt));

      // 3. Monta os dados para o relatório
      const reportData: any[] = [];

      for (const message of allMessages) {
        const patient = nutritionistPatients.find((p) => p.userId === message.userId);
        if (patient) {
          reportData.push({
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email || 'N/A',
            messageTitle: message.title,
            messageBody: message.body,
            status: message.isRead ? 'Lida' : 'Não Lida',
            createdAt: formatDateInBrazilTimezone(message.createdAt, true),
          });
        }
      }

      // 4. Cria o arquivo Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Mensagens Lidas');

      worksheet.columns = [
        { header: 'ID do Paciente', key: 'patientId', width: 25 },
        { header: 'Nome do Paciente', key: 'patientName', width: 30 },
        { header: 'Email do Paciente', key: 'patientEmail', width: 30 },
        { header: 'Título da Mensagem', key: 'messageTitle', width: 40 },
        { header: 'Corpo da Mensagem', key: 'messageBody', width: 60 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Data e Hora', key: 'createdAt', width: 25 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5F8F1' },
      };

      reportData.forEach((data) => {
        worksheet.addRow(data);
      });

      // Ajusta a largura das colunas para o conteúdo
      worksheet.columns.forEach((column) => {
        if (column.header === 'Corpo da Mensagem') {
          column.width = 60;
          // Ativa quebra de texto para a coluna de corpo
          worksheet.getColumn(column.key as string).alignment = {
            wrapText: true,
            vertical: 'top',
          };
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="relatorio_mensagens_lidas.xlsx"');

      const buffer = await workbook.xlsx.writeBuffer();
      res.send(buffer);
    } catch (error) {
      console.error('[MessagesReadReport] Erro ao exportar relatório:', error);
      res.status(500).json({ message: 'Falha ao exportar relatório de mensagens.' });
    }
  });

  // GET: Relatório de notificações para o nutricionista
  app.get('/api/push/report', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas nutricionistas.' });
      }

      const nutritionistPatients = await db
        .select({
          id: patients.id,
          name: patients.name,
          email: patients.email,
          userId: patients.userId,
        })
        .from(patients)
        .where(eq(patients.ownerId, req.user.id));

      const patientIds = nutritionistPatients.map(p => p.id);
      const patientUserIds = nutritionistPatients
        .map((patient) => patient.userId)
        .filter((userId): userId is string => Boolean(userId));

      const pushByUserId = new Map<string, number>();
      const inAppByUserId = new Map<string, { count: number; lastReceivedAt: Date | null }>();
      const subscriptionByPatientId = new Map<string, { status: string; expiresAt: Date | null }>();

      if (patientIds.length > 0) {
        // Buscar status de assinatura mais recente para cada paciente
        const latestSubscriptions = await db
          .select()
          .from(subscriptions)
          .where(inArray(subscriptions.patientId, patientIds))
          .orderBy(desc(subscriptions.createdAt));

        // Como ordenamos por createdAt desc, pegamos apenas a primeira ocorrência de cada patientId
        latestSubscriptions.forEach((sub) => {
          if (!subscriptionByPatientId.has(sub.patientId)) {
            subscriptionByPatientId.set(sub.patientId, {
              status: sub.status,
              expiresAt: sub.expiresAt,
            });
          }
        });
      }

      if (patientUserIds.length > 0) {
        const pushStats = await db
          .select({
            userId: pushSubscriptions.userId,
            total: sql<number>`count(*)::int`,
          })
          .from(pushSubscriptions)
          .where(inArray(pushSubscriptions.userId, patientUserIds))
          .groupBy(pushSubscriptions.userId);

        pushStats.forEach((row) => {
          pushByUserId.set(row.userId, row.total);
        });

        const inAppStats = await db
          .select({
            userId: inAppNotifications.userId,
            total: sql<number>`count(*)::int`,
            lastReceivedAt: sql<Date | null>`max(${inAppNotifications.createdAt})`,
          })
          .from(inAppNotifications)
          .where(
            and(
              inArray(inAppNotifications.userId, patientUserIds),
              eq(inAppNotifications.type, 'message')
            )
          )
          .groupBy(inAppNotifications.userId);

        inAppStats.forEach((row) => {
          inAppByUserId.set(row.userId, {
            count: row.total,
            lastReceivedAt: row.lastReceivedAt,
          });
        });
      }

      const report = nutritionistPatients.map((patient) => {
        const userId = patient.userId;
        const pushCount = userId ? (pushByUserId.get(userId) ?? 0) : 0;
        const messageStats = userId ? inAppByUserId.get(userId) : undefined;
        const subInfo = subscriptionByPatientId.get(patient.id);

        return {
          patientId: patient.id,
          patientName: patient.name,
          patientEmail: patient.email,
          userId,
          hasAccount: Boolean(userId),
          hasPushEnabled: pushCount > 0,
          pushSubscriptions: pushCount,
          messagesReceived: messageStats?.count ?? 0,
          lastMessageReceivedAt: messageStats?.lastReceivedAt ?? null,
          subscriptionStatus: subInfo?.status || 'none',
          subscriptionExpiresAt: subInfo?.expiresAt || null,
        };
      });

      return res.json({
        totals: {
          patients: report.length,
          withAccount: report.filter((item) => item.hasAccount).length,
          withPushEnabled: report.filter((item) => item.hasPushEnabled).length,
          receivedMessages: report.filter((item) => item.messagesReceived > 0).length,
        },
        report,
      });
    } catch (error) {
      console.error('[PushNotifications] Erro ao gerar relatório:', error);
      res.status(500).json({ message: 'Falha ao gerar relatório de notificações.' });
    }
  });

  // GET: Patient fetches their own latest anthropometric assessment
  app.get('/api/my-anthropometry/latest', isAuthenticated, async (req: any, res) => {
    try {
      // Adiciona headers de cache-control para garantir que dados sempre frescos sejam buscados
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const patientProfile = await storage.getPatientByUserId(req.user.id);
      if (!patientProfile) {
        return res.status(404).json({ message: "Perfil de paciente não encontrado." });
      }
      const [latest] = await db
        .select()
        .from(anthropometricAssessments)
        .where(eq(anthropometricAssessments.patientId, patientProfile.id))
        .orderBy(desc(anthropometricAssessments.createdAt))
        .limit(1);
      if (!latest) {
        return res.status(404).json({ message: "Nenhuma avaliação encontrada." });
      }
      return res.json(latest);
    } catch (error) {
      console.error("Erro ao buscar última avaliação antropométrica:", error);
      res.status(500).json({ message: "Falha ao buscar avaliação antropométrica." });
    }
  });

  // GET: Patient fetches their full anthropometric assessment history (for evolution charts)
  app.get('/api/my-anthropometry/history', isAuthenticated, async (req: any, res) => {
    try {
      const patientProfile = await storage.getPatientByUserId(req.user.id);
      if (!patientProfile) {
        return res.status(404).json({ message: "Perfil de paciente não encontrado." });
      }
      const history = await db
        .select()
        .from(anthropometricAssessments)
        .where(eq(anthropometricAssessments.patientId, patientProfile.id))
        .orderBy(anthropometricAssessments.createdAt);
      return res.json(history);
    } catch (error) {
      console.error("Erro ao buscar histórico de avaliações antropométricas:", error);
      res.status(500).json({ message: "Falha ao buscar histórico de avaliações." });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Rotas de Notificações In-App (inbox interno do paciente)
  // Funcionam independente de qualquer permissão do sistema operacional.
  // ─────────────────────────────────────────────────────────────────────────────

  // GET: Paciente busca suas notificações in-app (mais recentes primeiro)
  app.get('/api/notifications/inbox', isAuthenticated, async (req: any, res) => {
    try {
      const notifications = await db
        .select()
        .from(inAppNotifications)
        .where(eq(inAppNotifications.userId, req.user.id))
        .orderBy(desc(inAppNotifications.createdAt))
        .limit(50);
      return res.json(notifications);
    } catch (error) {
      console.error('[InAppNotifications] Erro ao buscar notificações:', error);
      res.status(500).json({ message: 'Falha ao buscar notificações.' });
    }
  });

  // GET: Conta de notificações não lidas do paciente (para o badge)
  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(inAppNotifications)
        .where(and(
          eq(inAppNotifications.userId, req.user.id),
          eq(inAppNotifications.isRead, false)
        ));
      return res.json({ count: result[0]?.count ?? 0 });
    } catch (error) {
      console.error('[InAppNotifications] Erro ao contar não lidas:', error);
      res.status(500).json({ message: 'Falha ao contar notificações.' });
    }
  });

  // PATCH: Paciente marca uma notificação como lida
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      await db
        .update(inAppNotifications)
        .set({ isRead: true })
        .where(and(
          eq(inAppNotifications.id, req.params.id),
          eq(inAppNotifications.userId, req.user.id)
        ));
      return res.json({ ok: true });
    } catch (error) {
      console.error('[InAppNotifications] Erro ao marcar como lida:', error);
      res.status(500).json({ message: 'Falha ao marcar notificação como lida.' });
    }
  });

  // PATCH: Paciente marca todas as notificações como lidas
  app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      await db
        .update(inAppNotifications)
        .set({ isRead: true })
        .where(and(
          eq(inAppNotifications.userId, req.user.id),
          eq(inAppNotifications.isRead, false)
        ));
      return res.json({ ok: true });
    } catch (error) {
      console.error('[InAppNotifications] Erro ao marcar todas como lidas:', error);
      res.status(500).json({ message: 'Falha ao marcar notificações como lidas.' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Rotas de Modelos de Notificações (Notification Templates)
  // Permitem ao nutricionista salvar, listar, editar e excluir modelos
  // de título e corpo de mensagem para reutilização rápida.
  // ─────────────────────────────────────────────────────────────────────────────

  // GET: Listar todos os modelos do nutricionista autenticado
  app.get('/api/notification-templates', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' });
      }
      const templates = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.nutritionistId, req.user.id))
        .orderBy(desc(notificationTemplates.createdAt));
      return res.json(templates);
    } catch (error) {
      console.error('[NotificationTemplates] Erro ao listar modelos:', error);
      res.status(500).json({ message: 'Falha ao listar modelos de notificação.' });
    }
  });

  // POST: Criar um novo modelo de notificação
  app.post('/api/notification-templates', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' });
      }
      const { title, body } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ message: 'O título do modelo é obrigatório.' });
      }
      if (!body || !body.trim()) {
        return res.status(400).json({ message: 'O corpo da mensagem é obrigatório.' });
      }
      if (title.length > 100) {
        return res.status(400).json({ message: 'O título deve ter no máximo 100 caracteres.' });
      }
      if (body.length > 300) {
        return res.status(400).json({ message: 'A mensagem deve ter no máximo 300 caracteres.' });
      }
      const [template] = await db
        .insert(notificationTemplates)
        .values({
          id: nanoid(),
          nutritionistId: req.user.id,
          title: title.trim(),
          body: body.trim(),
        })
        .returning();
      return res.status(201).json(template);
    } catch (error) {
      console.error('[NotificationTemplates] Erro ao criar modelo:', error);
      res.status(500).json({ message: 'Falha ao criar modelo de notificação.' });
    }
  });

  // PATCH: Atualizar um modelo de notificação existente
  app.patch('/api/notification-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' });
      }
      const { id } = req.params;
      const { title, body } = req.body;
      // Verificar se o modelo pertence ao nutricionista
      const [existing] = await db
        .select()
        .from(notificationTemplates)
        .where(and(
          eq(notificationTemplates.id, id),
          eq(notificationTemplates.nutritionistId, req.user.id)
        ))
        .limit(1);
      if (!existing) {
        return res.status(404).json({ message: 'Modelo não encontrado.' });
      }
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (title !== undefined) {
        if (!title.trim()) return res.status(400).json({ message: 'O título não pode ser vazio.' });
        if (title.length > 100) return res.status(400).json({ message: 'O título deve ter no máximo 100 caracteres.' });
        updates.title = title.trim();
      }
      if (body !== undefined) {
        if (!body.trim()) return res.status(400).json({ message: 'A mensagem não pode ser vazia.' });
        if (body.length > 300) return res.status(400).json({ message: 'A mensagem deve ter no máximo 300 caracteres.' });
        updates.body = body.trim();
      }
      const [updated] = await db
        .update(notificationTemplates)
        .set(updates)
        .where(eq(notificationTemplates.id, id))
        .returning();
      return res.json(updated);
    } catch (error) {
      console.error('[NotificationTemplates] Erro ao atualizar modelo:', error);
      res.status(500).json({ message: 'Falha ao atualizar modelo de notificação.' });
    }
  });

  // DELETE: Excluir um modelo de notificação
  app.delete('/api/notification-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado.' });
      }
      const { id } = req.params;
      // Verificar se o modelo pertence ao nutricionista
      const [existing] = await db
        .select()
        .from(notificationTemplates)
        .where(and(
          eq(notificationTemplates.id, id),
          eq(notificationTemplates.nutritionistId, req.user.id)
        ))
        .limit(1);
      if (!existing) {
        return res.status(404).json({ message: 'Modelo não encontrado.' });
      }
      await db
        .delete(notificationTemplates)
        .where(eq(notificationTemplates.id, id));
      return res.json({ ok: true });
    } catch (error) {
      console.error('[NotificationTemplates] Erro ao excluir modelo:', error);
      res.status(500).json({ message: 'Falha ao excluir modelo de notificação.' });
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupRoutes(app);
  return createServer(app);
}
