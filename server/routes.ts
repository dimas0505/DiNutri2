import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import { storage, deleteFoodDiaryPhoto } from "./storage.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import { insertPatientSchema, updatePatientSchema, insertPrescriptionSchema, updatePrescriptionSchema, insertMoodEntrySchema, insertAnamnesisRecordSchema, insertFoodDiaryEntrySchema, insertSubscriptionSchema } from "../shared/schema.js";
import { z } from "zod";
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { put } from '@vercel/blob';
import multer from 'multer';
import { eq, and, desc, or } from 'drizzle-orm';
import { anamnesisRecords, foodDiaryEntries, prescriptions, users, patients, subscriptions } from '../shared/schema.js';
import { db } from './db.js';
import sharp from 'sharp';
import { nanoid } from 'nanoid';

const SALT_ROUNDS = 10;

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

// Middleware to check if the user is an admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  
  // Middleware para parsear o corpo da requisição de upload
  app.use(bodyParser.json());

  // --- AUTHENTICATION ROUTES ---
  app.post('/api/login', passport.authenticate('local'), (req, res) => {
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
      const prescriptionData = insertPrescriptionSchema.parse({
        ...req.body,
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
      const prescriptionData = updatePrescriptionSchema.parse(req.body);
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
    } catch (error) {
      console.error("Error publishing prescription:", error);
      res.status(500).json({ message: "Failed to publish prescription" });
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
      const prescriptions = await storage.getPublishedPrescriptionsForUser(req.user.id);
      res.json(prescriptions);
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
      const { patientId } = req.params;
      
      // Verify that the nutritionist owns this patient
      const patient = await storage.getPatient(patientId);
      if (!patient || patient.ownerId !== req.user.id) {
        return res.status(404).json({ message: "Paciente não encontrado ou acesso não autorizado." });
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
      const nutritionistId = req.user.id;

      // 1. Find the food diary entry and verify nutritionist permission
      const entry = await db.query.foodDiaryEntries.findFirst({
        where: eq(foodDiaryEntries.id, entryId),
        with: {
          patient: true,
        },
      });

      if (!entry || entry.patient.ownerId !== nutritionistId) {
        return res.status(404).json({ message: 'Entrada do diário não encontrada ou não autorizada.' });
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
      const updateData = req.body;

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

      // Update subscription
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
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

  return createServer(app);
}