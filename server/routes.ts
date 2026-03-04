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
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { anamnesisRecords, foodDiaryEntries, prescriptions, users, patients, subscriptions, activityLog, patientDocuments, anthropometricAssessments } from '../shared/schema.js';
import { db } from './db.js';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { logActivity } from './activity-logger.js';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

const SALT_ROUNDS = 10;

// Configure multer for prescription PDF uploads
const uploadPrescriptionPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'));
    }
  },
});

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

  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check dependencies first
        const hasPatients = await storage.userHasPatients(id);
        const hasPrescriptions = await storage.userHasPrescriptions(id);
        
        if (hasPatients || hasPrescriptions) {
            return res.status(400).json({ 
                message: "Não é possível excluir este usuário pois ele possui pacientes ou prescrições associadas. Transfira os dados antes de excluir." 
            });
        }

        // Se tiver convites, deleta eles primeiro
        await storage.deleteUserInvitations(id);
        
        await storage.deleteUser(id);
        res.status(204).send();
    } catch (error) {
        console.error("Erro ao excluir usuário:", error);
        res.status(500).json({ message: "Falha ao excluir usuário." });
    }
  });

  app.post('/api/admin/users/transfer', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { fromUserId, toUserId } = req.body;
      if (!fromUserId || !toUserId) {
        return res.status(400).json({ message: "IDs de origem e destino são obrigatórios." });
      }
      
      await storage.transferPatients(fromUserId, toUserId);
      res.json({ message: "Dados transferidos com sucesso." });
    } catch (error) {
      console.error("Erro ao transferir dados:", error);
      res.status(500).json({ message: "Falha ao transferir dados." });
    }
  });

  // --- PATIENT ROUTES ---
  app.get('/api/nutritionist/patients', isAuthenticated, async (req: any, res) => {
    try {
        if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Acesso negado. Apenas nutricionistas." });
        }
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
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        
        // Check ownership
        if (req.user.role !== 'admin' && patient.ownerId !== req.user.id && patient.userId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        res.json(patient);
    } catch (error) {
        console.error("Erro ao buscar paciente:", error);
        res.status(500).json({ message: "Falha ao buscar paciente." });
    }
  });

  app.post('/api/patients', isAuthenticated, async (req: any, res) => {
    try {
        if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const validatedData = insertPatientSchema.parse(req.body);
        const patient = await storage.createPatient({ ...validatedData, ownerId: req.user.id });
        
        logActivity({ userId: req.user.id, activityType: 'create_patient', details: `Paciente criado: ${patient.firstName} ${patient.lastName}` });
        res.status(201).json(patient);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
        }
        console.error("Erro ao criar paciente:", error);
        res.status(500).json({ message: "Falha ao criar paciente." });
    }
  });

  app.put('/api/patients/:id', isAuthenticated, async (req: any, res) => {
    try {
        const patient = await storage.getPatient(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        
        if (req.user.role !== 'admin' && patient.ownerId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const validatedData = updatePatientSchema.parse(req.body);
        const updatedPatient = await storage.updatePatient(req.params.id, validatedData);
        
        logActivity({ userId: req.user.id, activityType: 'update_patient', details: `Paciente atualizado: ${updatedPatient.firstName} ${updatedPatient.lastName}` });
        res.json(updatedPatient);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
        }
        console.error("Erro ao atualizar paciente:", error);
        res.status(500).json({ message: "Falha ao atualizar paciente." });
    }
  });

  app.delete('/api/patients/:id', isAuthenticated, async (req: any, res) => {
    try {
        const patient = await storage.getPatient(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        
        if (req.user.role !== 'admin' && patient.ownerId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        await storage.deletePatient(req.params.id);
        logActivity({ userId: req.user.id, activityType: 'delete_patient', details: `Paciente excluído: ${patient.firstName} ${patient.lastName}` });
        res.status(204).send();
    } catch (error) {
        console.error("Erro ao excluir paciente:", error);
        res.status(500).json({ message: "Falha ao excluir paciente." });
    }
  });

  // --- PRESCRIPTION ROUTES ---
  app.get('/api/patients/:id/prescriptions', isAuthenticated, async (req: any, res) => {
    try {
        const patient = await storage.getPatient(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        
        if (req.user.role !== 'admin' && patient.ownerId !== req.user.id && patient.userId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const prescriptions = await storage.getPrescriptionsByPatient(req.params.id);
        res.json(prescriptions);
    } catch (error) {
        console.error("Erro ao buscar prescrições:", error);
        res.status(500).json({ message: "Falha ao buscar prescrições." });
    }
  });

  app.post('/api/prescriptions', isAuthenticated, async (req: any, res) => {
    try {
        if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const validatedData = insertPrescriptionSchema.parse(req.body);
        const prescription = await storage.createPrescription({ ...validatedData, nutritionistId: req.user.id });
        
        logActivity({ userId: req.user.id, activityType: 'create_prescription', details: `Prescrição criada: ${prescription.title}` });
        res.status(201).json(prescription);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
        }
        console.error("Erro ao criar prescrição:", error);
        res.status(500).json({ message: "Falha ao criar prescrição." });
    }
  });

  app.put('/api/prescriptions/:id', isAuthenticated, async (req: any, res) => {
    try {
        const prescription = await storage.getPrescription(req.params.id);
        if (!prescription) {
            return res.status(404).json({ message: "Prescrição não encontrada." });
        }
        
        if (req.user.role !== 'admin' && prescription.nutritionistId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const validatedData = updatePrescriptionSchema.parse(req.body);
        const updatedPrescription = await storage.updatePrescription(req.params.id, validatedData);
        
        logActivity({ userId: req.user.id, activityType: 'update_prescription', details: `Prescrição atualizada: ${updatedPrescription.title}` });
        res.json(updatedPrescription);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
        }
        console.error("Erro ao atualizar prescrição:", error);
        res.status(500).json({ message: "Falha ao atualizar prescrição." });
    }
  });

  app.delete('/api/prescriptions/:id', isAuthenticated, async (req: any, res) => {
    try {
        const prescription = await storage.getPrescription(req.params.id);
        if (!prescription) {
            return res.status(404).json({ message: "Prescrição não encontrada." });
        }
        
        if (req.user.role !== 'admin' && prescription.nutritionistId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        await storage.deletePrescription(req.params.id);
        logActivity({ userId: req.user.id, activityType: 'delete_prescription', details: `Prescrição excluída: ${prescription.title}` });
        res.status(204).send();
    } catch (error) {
        console.error("Erro ao excluir prescrição:", error);
        res.status(500).json({ message: "Falha ao excluir prescrição." });
    }
  });

  // --- INVITATION ROUTES ---
  app.post('/api/patients/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
        const patient = await storage.getPatient(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        
        if (req.user.role !== 'admin' && patient.ownerId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const invitation = await storage.createInvitation(req.params.id);
        
        logActivity({ userId: req.user.id, activityType: 'create_invitation', details: `Convite gerado para paciente: ${patient.firstName} ${patient.lastName}` });
        res.status(201).json(invitation);
    } catch (error) {
        console.error("Erro ao criar convite:", error);
        res.status(500).json({ message: "Falha ao criar convite." });
    }
  });

  app.post('/api/auth/register-patient', async (req, res) => {
    try {
        const { token, email, password } = req.body;
        
        const invitation = await storage.getInvitationByToken(token);
        if (!invitation || invitation.used) {
            return res.status(400).json({ message: "Convite inválido ou já utilizado." });
        }
        
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: "Este email já está cadastrado." });
        }
        
        const patient = await storage.getPatient(invitation.patientId);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await storage.upsertUser({
            email,
            hashedPassword,
            firstName: patient.firstName,
            lastName: patient.lastName,
            role: 'patient'
        });
        
        await storage.updatePatientUserId(patient.id, user.id);
        await storage.markInvitationAsUsed(invitation.id);
        
        logActivity({ userId: user.id, activityType: 'register_patient', details: `Paciente registrado via convite` });
        
        // Log the user in after registration
        req.login(user, (err) => {
            if (err) return res.status(500).json({ message: "Erro ao realizar login após registro." });
            res.status(201).json(user);
        });
    } catch (error) {
        console.error("Erro ao registrar paciente:", error);
        res.status(500).json({ message: "Falha ao registrar paciente." });
    }
  });

  // --- MOOD ENTRY ROUTES ---
  app.get('/api/patients/:id/mood-entries', isAuthenticated, async (req: any, res) => {
    try {
        const patient = await storage.getPatient(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        
        if (req.user.role !== 'admin' && patient.ownerId !== req.user.id && patient.userId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const entries = await storage.getMoodEntriesByPatient(req.params.id);
        res.json(entries);
    } catch (error) {
        console.error("Erro ao buscar registros de humor:", error);
        res.status(500).json({ message: "Falha ao buscar registros de humor." });
    }
  });

  app.post('/api/mood-entries', isAuthenticated, async (req: any, res) => {
    try {
        if (req.user.role !== 'patient') {
            return res.status(403).json({ message: "Apenas pacientes podem registrar humor." });
        }
        
        const patient = await storage.getPatientByUserId(req.user.id);
        if (!patient) {
            return res.status(404).json({ message: "Perfil de paciente não encontrado." });
        }
        
        const validatedData = insertMoodEntrySchema.parse(req.body);
        const entry = await storage.createMoodEntry({ ...validatedData, patientId: patient.id });
        
        logActivity({ userId: req.user.id, activityType: 'create_mood_entry' });
        res.status(201).json(entry);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
        }
        console.error("Erro ao criar registro de humor:", error);
        res.status(500).json({ message: "Falha ao criar registro de humor." });
    }
  });

  // --- ANAMNESIS RECORD ROUTES ---
  app.get('/api/patients/:id/anamnesis', isAuthenticated, async (req: any, res) => {
    try {
        const patient = await storage.getPatient(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        
        if (req.user.role !== 'admin' && patient.ownerId !== req.user.id && patient.userId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const records = await storage.getAnamnesisRecordsByPatient(req.params.id);
        res.json(records);
    } catch (error) {
        console.error("Erro ao buscar anamneses:", error);
        res.status(500).json({ message: "Falha ao buscar anamneses." });
    }
  });

  app.post('/api/anamnesis', isAuthenticated, async (req: any, res) => {
    try {
        if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const validatedData = insertAnamnesisRecordSchema.parse(req.body);
        const record = await storage.createAnamnesisRecord({ ...validatedData, nutritionistId: req.user.id });
        
        logActivity({ userId: req.user.id, activityType: 'create_anamnesis', details: `Anamnese criada para paciente ID: ${record.patientId}` });
        res.status(201).json(record);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
        }
        console.error("Erro ao criar anamnese:", error);
        res.status(500).json({ message: "Falha ao criar anamnese." });
    }
  });

  // --- FOOD DIARY ROUTES ---
  app.get('/api/patients/:id/food-diary', isAuthenticated, async (req: any, res) => {
    try {
        const patient = await storage.getPatient(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: "Paciente não encontrado." });
        }
        
        if (req.user.role !== 'admin' && patient.ownerId !== req.user.id && patient.userId !== req.user.id) {
            return res.status(403).json({ message: "Acesso negado." });
        }
        
        const entries = await storage.getFoodDiaryEntriesByPatient(req.params.id);
        res.json(entries);
    } catch (error) {
        console.error("Erro ao buscar diário alimentar:", error);
        res.status(500).json({ message: "Falha ao buscar diário alimentar." });
    }
  });

  app.post('/api/food-diary', isAuthenticated, async (req: any, res) => {
    try {
        if (req.user.role !== 'patient') {
            return res.status(403).json({ message: "Apenas pacientes podem registrar refeições." });
        }
        
        const patient = await storage.getPatientByUserId(req.user.id);
        if (!patient) {
            return res.status(404).json({ message: "Perfil de paciente não encontrado." });
        }
        
        const validatedData = insertFoodDiaryEntrySchema.parse(req.body);
        const entry = await storage.createFoodDiaryEntry({ ...validatedData, patientId: patient.id });
        
        logActivity({ userId: req.user.id, activityType: 'create_food_diary_entry' });
        res.status(201).json(entry);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
        }
        console.error("Erro ao criar registro no diário alimentar:", error);
        res.status(500).json({ message: "Falha ao criar registro no diário alimentar." });
    }
  });

  app.delete('/api/food-diary/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get entry to check ownership and get photo URL
      const [entry] = await db.select().from(foodDiaryEntries).where(eq(foodDiaryEntries.id, id));
      
      if (!entry) {
        return res.status(404).json({ message: "Registro não encontrado." });
      }
      
      // Check ownership - either the patient who created it or their nutritionist
      const patient = await storage.getPatient(entry.patientId);
      if (req.user.role !== 'admin' && entry.patientId !== (await storage.getPatientByUserId(req.user.id))?.id && patient?.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Acesso negado." });
      }
      
      // If there's a photo, delete it from Vercel Blob
      if (entry.imageUrl) {
        await deleteFoodDiaryPhoto(entry.imageUrl);
      }
      
      // Delete from database
      await db.delete(foodDiaryEntries).where(eq(foodDiaryEntries.id, id));
      
      logActivity({ userId: req.user.id, activityType: 'delete_food_diary_entry' });
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir registro do diário alimentar:", error);
      res.status(500).json({ message: "Falha ao excluir registro do diário alimentar." });
    }
  });

  // --- ACTIVITY LOG ROUTES ---
  app.get('/api/nutritionist/activity-log', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado." });
      }
      
      // Get activities for all patients owned by this nutritionist
      const patientsList = await storage.getPatientsByOwner(req.user.id);
      const patientUserIds = patientsList.map(p => p.userId).filter(Boolean) as string[];
      
      if (patientUserIds.length === 0) {
        return res.json([]);
      }
      
      const logs = await db.select({
        id: activityLog.id,
        userId: activityLog.userId,
        activityType: activityLog.activityType,
        details: activityLog.details,
        timestamp: activityLog.timestamp,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`
      })
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .where(or(
        ...patientUserIds.map(id => eq(activityLog.userId, id))
      ))
      .orderBy(desc(activityLog.timestamp))
      .limit(50);
      
      res.json(logs);
    } catch (error) {
      console.error("Erro ao buscar log de atividades:", error);
      res.status(500).json({ message: "Falha ao buscar log de atividades." });
    }
  });

  // --- DASHBOARD STATS ROUTES ---
  app.get('/api/nutritionist/dashboard-stats', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado." });
      }
      
      const patientsList = await storage.getPatientsByOwner(req.user.id);
      const totalPatients = patientsList.length;
      
      const prescriptionsList = await db.select().from(prescriptions).where(eq(prescriptions.nutritionistId, req.user.id));
      const totalPrescriptions = prescriptionsList.length;
      
      // Active patients (those with at least one mood or food diary entry in the last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const patientUserIds = patientsList.map(p => p.userId).filter(Boolean) as string[];
      let activePatients = 0;
      
      if (patientUserIds.length > 0) {
        const recentActivity = await db.select({
          userId: activityLog.userId
        })
        .from(activityLog)
        .where(and(
          or(...patientUserIds.map(id => eq(activityLog.userId, id))),
          gte(activityLog.timestamp, sevenDaysAgo)
        ))
        .groupBy(activityLog.userId);
        
        activePatients = recentActivity.length;
      }
      
      res.json({
        totalPatients,
        totalPrescriptions,
        activePatients,
        pendingInvitations: (await db.select().from(invitations).where(and(
          or(...patientsList.map(p => eq(invitations.patientId, p.id))),
          eq(invitations.used, false)
        ))).length
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas do dashboard:", error);
      res.status(500).json({ message: "Falha ao buscar estatísticas." });
    }
  });

  // --- VERCEL BLOB STORAGE ROUTES ---
  app.post('/api/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
      }

      // Process image with sharp to reduce size and ensure format
      const processedImageBuffer = await sharp(req.file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const filename = `food-diary/${nanoid()}.jpg`;
      const blob = await put(filename, processedImageBuffer, {
        access: 'public',
        contentType: 'image/jpeg',
      });

      res.json(blob);
    } catch (error) {
      console.error('Erro no upload para Vercel Blob:', error);
      res.status(500).json({ message: 'Falha no upload da imagem.' });
    }
  });

  // --- SUBSCRIPTION ROUTES ---
  app.get('/api/admin/subscriptions', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allSubscriptions = await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
      res.json(allSubscriptions);
    } catch (error) {
      console.error("Erro ao buscar assinaturas:", error);
      res.status(500).json({ message: "Falha ao buscar assinaturas." });
    }
  });

  app.post('/api/admin/subscriptions', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validatedData = insertSubscriptionSchema.parse(req.body);
      const subscriptionWithId = { id: nanoid(), ...validatedData };
      const [newSubscription] = await db.insert(subscriptions).values(subscriptionWithId).returning();
      res.status(201).json(newSubscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
      }
      console.error("Erro ao criar assinatura:", error);
      res.status(500).json({ message: "Falha ao criar assinatura." });
    }
  });

  app.get('/api/my-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.user.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      
      if (!subscription) {
        return res.json({ status: 'none', plan: 'free' });
      }
      
      res.json(subscription);
    } catch (error) {
      console.error("Erro ao buscar minha assinatura:", error);
      res.status(500).json({ message: "Falha ao buscar assinatura." });
    }
  });

  // --- PATIENT DOCUMENTS ROUTES ---
  app.get('/api/patients/:id/documents', isAuthenticated, async (req: any, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado." });
      }
      
      if (req.user.role !== 'admin' && patient.ownerId !== req.user.id && patient.userId !== req.user.id) {
        return res.status(403).json({ message: "Acesso negado." });
      }
      
      const docs = await db.select().from(patientDocuments).where(eq(patientDocuments.patientId, req.params.id)).orderBy(desc(patientDocuments.createdAt));
      res.json(docs);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      res.status(500).json({ message: "Falha ao buscar documentos." });
    }
  });

  app.post('/api/patients/:id/documents', isAuthenticated, uploadDocument.single('file'), async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado." });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
      }

      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado." });
      }

      const fileExtension = path.extname(req.file.originalname);
      const filename = `documents/${req.params.id}/${nanoid()}${fileExtension}`;
      
      const blob = await put(filename, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
      });

      const docId = nanoid();
      const [newDoc] = await db.insert(patientDocuments).values({
        id: docId,
        patientId: req.params.id,
        nutritionistId: req.user.id,
        fileName: req.file.originalname,
        fileUrl: blob.url,
      }).returning();

      logActivity({ userId: req.user.id, activityType: 'upload_document', details: `Documento enviado para paciente: ${patient.firstName} - ${req.file.originalname}` });
      res.status(201).json(newDoc);
    } catch (error) {
      console.error('Erro no upload de documento:', error);
      res.status(500).json({ message: 'Falha no upload do documento.' });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const [doc] = await db.select().from(patientDocuments).where(eq(patientDocuments.id, req.params.id));
      if (!doc) {
        return res.status(404).json({ message: "Documento não encontrado." });
      }

      if (req.user.role !== 'admin' && doc.nutritionistId !== req.user.id) {
        return res.status(403).json({ message: "Acesso negado." });
      }

      // Delete from Vercel Blob
      await deleteFoodDiaryPhoto(doc.fileUrl);
      
      // Delete from database
      await db.delete(patientDocuments).where(eq(patientDocuments.id, req.params.id));

      logActivity({ userId: req.user.id, activityType: 'delete_document', details: `Documento excluído: ${doc.fileName}` });
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao excluir documento:", error);
      res.status(500).json({ message: "Falha ao excluir documento." });
    }
  });

  // --- ANTHROPOMETRIC ASSESSMENT ROUTES ---
  app.get('/api/patients/:id/anthropometry', isAuthenticated, async (req: any, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado." });
      }
      if (req.user.role !== 'admin' && patient.ownerId !== req.user.id && patient.userId !== req.user.id) {
        return res.status(403).json({ message: "Acesso negado." });
      }
      const assessments = await db
        .select()
        .from(anthropometricAssessments)
        .where(eq(anthropometricAssessments.patientId, req.params.id))
        .orderBy(desc(anthropometricAssessments.createdAt));
      res.json(assessments);
    } catch (error) {
      console.error("Erro ao buscar avaliações antropométricas:", error);
      res.status(500).json({ message: "Falha ao buscar avaliações antropométricas." });
    }
  });

  app.post('/api/anthropometry', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado. Apenas nutricionistas." });
      }
      const validatedData = insertAnthropometricAssessmentSchema.parse(req.body);
      const assessmentWithId = {
        id: nanoid(),
        nutritionistId: req.user.id,
        ...validatedData,
      };
      const [newAssessment] = await db.insert(anthropometricAssessments).values(assessmentWithId).returning();
      logActivity({
        userId: req.user.id,
        activityType: 'create_anthropometry',
        details: `Avaliação antropométrica criada para paciente ID: ${newAssessment.patientId}`,
      });
      res.status(201).json(newAssessment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
      }
      console.error("Erro ao criar avaliação antropométrica:", error);
      res.status(500).json({ message: "Falha ao criar avaliação antropométrica." });
    }
  });

  app.put('/api/anthropometry/:id', isAuthenticated, async (req: any, res) => {
    try {
      const [existing] = await db
        .select()
        .from(anthropometricAssessments)
        .where(and(eq(anthropometricAssessments.id, req.params.id), eq(anthropometricAssessments.nutritionistId, req.user.id)));
      if (!existing) {
        return res.status(404).json({ message: "Avaliação não encontrada ou acesso não autorizado." });
      }
      const validatedData = updateAnthropometricAssessmentSchema.parse(req.body);
      const [updated] = await db
        .update(anthropometricAssessments)
        .set(validatedData)
        .where(eq(anthropometricAssessments.id, req.params.id))
        .returning();
      logActivity({
        userId: req.user.id,
        activityType: 'update_anthropometry',
        details: `Avaliação antropométrica atualizada para paciente ID: ${updated.patientId}`,
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.errors });
      }
      console.error("Erro ao atualizar avaliação antropométrica:", error);
      res.status(500).json({ message: "Falha ao atualizar avaliação antropométrica." });
    }
  });

  app.delete('/api/anthropometry/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist' && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado." });
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

  // GET: Patient fetches their own latest anthropometric assessment
  app.get('/api/my-anthropometry/latest', isAuthenticated, async (req: any, res) => {
    try {
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
}

export async function registerRoutes(app: Express): Promise<Server> {
  await setupRoutes(app);
  return createServer(app);
}
