// Arquivo: server/routes.ts

import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import bcrypt from "bcrypt";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import { insertPatientSchema, insertPrescriptionSchema, updatePrescriptionSchema, insertMoodEntrySchema } from "../shared/schema.js";
import { z } from "zod";

const SALT_ROUNDS = 10;

// Middleware para verificar se o usuário é admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Configura a nova estratégia de autenticação (passport-local)
  await setupAuth(app);

  // --- NOVAS ROTAS DE AUTENTICAÇÃO ---
  app.post('/api/login', passport.authenticate('local'), (req, res) => {
    // Se a autenticação for bem-sucedida, o Passport anexa `req.user`.
    // Apenas retornamos o usuário para o frontend.
    res.json(req.user);
  });

  // ROTA DE LOGOUT ATUALIZADA
  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      // Destrói a sessão e limpa o cookie do navegador
      req.session.destroy(() => {
        res.clearCookie('connect.sid'); 
        // Redireciona para a página inicial em vez de retornar JSON
        res.redirect('/');
      });
    });
  });

  // Rota para verificar o usuário logado (sem alterações)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // --- ROTAS DE PERFIL DO USUÁRIO ---
  app.put('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
    const changePasswordSchema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    });

    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      
      // Verificar se a senha atual está correta
      const user = await storage.getUser(req.user.id);
      if (!user || !user.hashedPassword) {
        return res.status(401).json({ message: "Usuário não encontrado." });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ message: "Senha atual incorreta." });
      }

      // Gerar hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      // Atualizar a senha no banco
      await storage.updateUserPassword(req.user.id, hashedNewPassword);

      res.json({ message: "Senha alterada com sucesso." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
      }
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  app.put('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    const updateProfileSchema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
    });

    try {
      const profileData = updateProfileSchema.parse(req.body);
      
      // Verificar se o email já está em uso por outro usuário
      if (profileData.email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(profileData.email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(409).json({ message: "Este email já está em uso por outro usuário." });
        }
      }

      // Atualizar o perfil
      const updatedUser = await storage.updateUserProfile(req.user.id, profileData);
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // --- ROTAS DE ADMINISTRADOR ---
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    const createUserSchema = z.object({
      email: z.string().email(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      password: z.string().min(6),
      role: z.enum(["admin", "nutritionist"]),
    });

    try {
      const { password, ...userData } = createUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "Este email já está em uso." });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser = await storage.upsertUser({
        ...userData,
        hashedPassword,
      });

      res.status(201).json(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Buscar usuário específico por ID
  app.get('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Atualizar usuário específico
  app.put('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    const updateUserSchema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["admin", "nutritionist", "patient"]),
    });

    try {
      const userData = updateUserSchema.parse(req.body);
      const userId = req.params.id;
      
      // Verificar se o usuário existe
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      // Verificar se o email já está em uso por outro usuário
      if (userData.email !== existingUser.email) {
        const emailUser = await storage.getUserByEmail(userData.email);
        if (emailUser && emailUser.id !== userId) {
          return res.status(409).json({ message: "Este email já está em uso por outro usuário." });
        }
      }

      // Atualizar o usuário
      const updatedUser = await storage.updateUserProfile(userId, userData);
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Alterar senha de usuário específico
  app.put('/api/admin/users/:id/password', isAuthenticated, isAdmin, async (req: any, res) => {
    const changePasswordSchema = z.object({
      newPassword: z.string().min(6),
    });

    try {
      const { newPassword } = changePasswordSchema.parse(req.body);
      const userId = req.params.id;
      
      // Verificar se o usuário existe
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      // Gerar hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
      
      // Atualizar a senha no banco
      await storage.updateUserPassword(userId, hashedNewPassword);

      res.json({ message: "Senha alterada com sucesso." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
      }
      console.error("Error changing user password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Verificar dependências do usuário antes da exclusão
  app.get('/api/admin/users/:id/dependencies', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      const hasPatients = await storage.userHasPatients(userId);
      const hasPrescriptions = await storage.userHasPrescriptions(userId);
      const hasInvitations = await storage.userHasInvitations(userId);
      
      res.json({
        hasPatients,
        hasPrescriptions,
        hasInvitations,
        canDelete: !hasPatients && !hasPrescriptions // invitations podem ser excluídos automaticamente
      });
    } catch (error) {
      console.error("Error checking user dependencies:", error);
      res.status(500).json({ message: "Failed to check dependencies" });
    }
  });

  // Excluir usuário específico
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      // Verificar se o usuário existe
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado." });
      }

      // Não permitir que o usuário delete a si mesmo
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Você não pode excluir sua própria conta." });
      }

      // Não permitir excluir outros administradores (política de segurança)
      if (user.role === 'admin') {
        return res.status(400).json({ message: "Não é possível excluir outros administradores." });
      }

      // Tentar excluir o usuário
      await storage.deleteUser(userId);

      res.json({ message: "Usuário excluído com sucesso." });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      
      // Se for erro de dependência, retornar mensagem específica
      if (error.message.includes("pacientes associados") || error.message.includes("prescrições associadas")) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // --- ROTAS DE CONVITE (sem alterações) ---
  app.post('/api/invitations', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ message: "Only nutritionists can create invitations." });
      }
      const invitation = await storage.createInvitation(req.user.id);
      res.json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.get('/api/invitations/validate', async (req: any, res) => {
    // Esta rota agora é pública e valida o token da URL
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ message: "No invitation token found." });
      }
      const invitation = await storage.getInvitationByToken(token as string);
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation token." });
      }
      res.status(200).json({ valid: true });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({ message: "Failed to validate invitation" });
    }
  });

  // --- FLUXO DE CADASTRO DO PACIENTE VIA CONVITE (ATUALIZADO) ---
  app.post('/api/patient/register', async (req, res, next) => {
    const registerSchema = insertPatientSchema.extend({
      password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
      token: z.string().min(1, "Token de convite é obrigatório."),
    });

    try {
      const { token, password, ...patientData } = registerSchema.parse(req.body);
      
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Convite inválido ou expirado." });
      }

      const existingUser = await storage.getUserByEmail(patientData.email || "");
      if (existingUser) {
        return res.status(409).json({ message: "Este email já está em uso." });
      }

      // CORRIGIDO: Garantir que email está definido antes de criar o usuário
      if (!patientData.email) {
        return res.status(400).json({ message: "Email é obrigatório." });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser = await storage.upsertUser({
        email: patientData.email,
        firstName: patientData.name.split(' ')[0] || "",
        hashedPassword: hashedPassword,
        role: "patient",
      });

      const newPatient = await storage.createPatient({
        ...patientData,
        ownerId: invitation.nutritionistId,
        userId: newUser.id,
      });

      await storage.updateInvitationStatus(token, 'accepted');

      // Faz o login do usuário recém-criado
      req.login(newUser, (err) => {
        if (err) { return next(err); }
        res.status(201).json({ user: newUser, patient: newPatient });
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
      }
      console.error("Error during patient registration:", error);
      res.status(500).json({ message: "Falha ao registrar paciente." });
    }
  });

  // --- ROTAS DE PACIENTES GERENCIADAS PELO NUTRICIONISTA ---
  app.get('/api/patients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const patients = await storage.getPatientsByOwner(userId);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get('/api/patients/:id', isAuthenticated, async (req, res) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient:", error);
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  // ROTA DE CRIAÇÃO MANUAL DE PACIENTE (ATUALIZADA)
  app.post('/api/patients', isAuthenticated, async (req: any, res) => {
    const createManualSchema = insertPatientSchema.omit({ userId: true }).extend({
        password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
    });

    try {
      if (req.user.role !== 'nutritionist') {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { password, ...patientData } = createManualSchema.parse(req.body);
      
      // CORRIGIDO: Verificar se email está definido
      if (!patientData.email) {
        return res.status(400).json({ message: "Email é obrigatório." });
      }

      const existingUser = await storage.getUserByEmail(patientData.email);
      if (existingUser) {
        return res.status(409).json({ message: "Este email já está em uso." });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser = await storage.upsertUser({
        email: patientData.email,
        firstName: patientData.name.split(' ')[0] || "",
        hashedPassword: hashedPassword,
        role: "patient",
      });

      const newPatient = await storage.createPatient({
        ...patientData,
        ownerId: req.user.id,
        userId: newUser.id,
      });
      
      res.status(201).json(newPatient);

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data.", errors: error.flatten() });
      }
      console.error("Error creating patient:", error);
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  app.put('/api/patients/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPatientSchema.omit({ ownerId: true, userId: true }).partial().parse(req.body);
      const patient = await storage.updatePatient(req.params.id, validatedData);
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(400).json({ message: "Failed to update patient" });
    }
  });
  
  // --- ROTAS DE PRESCRIÇÃO ---
  app.get('/api/patients/:patientId/prescriptions', isAuthenticated, async (req, res) => {
    try {
      const prescriptions = await storage.getPrescriptionsByPatient(req.params.patientId);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  app.post('/api/prescriptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertPrescriptionSchema.parse({
        ...req.body,
        nutritionistId: userId,
      });
      const prescription = await storage.createPrescription(validatedData);
      res.json(prescription);
    } catch (error) {
      console.error("Error creating prescription:", error);
      res.status(400).json({ message: "Failed to create prescription" });
    }
  });

  app.get('/api/prescriptions/:id', isAuthenticated, async (req, res) => {
    try {
      const prescription = await storage.getPrescription(req.params.id);
      if (!prescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }
      res.json(prescription);
    } catch (error) {
      console.error("Error fetching prescription:", error);
      res.status(500).json({ message: "Failed to fetch prescription" });
    }
  });

  app.put('/api/prescriptions/:id', isAuthenticated, async (req, res) => {
    try {
      const validatedData = updatePrescriptionSchema.parse(req.body);
      const prescription = await storage.updatePrescription(req.params.id, validatedData);
      res.json(prescription);
    } catch (error) {
      console.error("Error updating prescription:", error);
      res.status(400).json({ message: "Failed to update prescription" });
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
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }
      const prescription = await storage.duplicatePrescription(req.params.id, title);
      res.json(prescription);
    } catch (error) {
      console.error("Error duplicating prescription:", error);
      res.status(500).json({ message: "Failed to duplicate prescription" });
    }
  });

  // Rota para excluir prescrição
  app.delete('/api/prescriptions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const prescription = await storage.getPrescription(req.params.id);
      
      if (!prescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }

      // Verificar se o usuário tem permissão para excluir
      if (prescription.nutritionistId !== req.user.id) {
        return res.status(403).json({ message: "Permission denied" });
      }

      await storage.deletePrescription(req.params.id);
      res.json({ message: "Prescription deleted successfully" });
    } catch (error) {
      console.error("Error deleting prescription:", error);
      res.status(500).json({ message: "Failed to delete prescription" });
    }
  });

  app.get('/api/patient/my-prescription', isAuthenticated, async (req: any, res) => {
    try {
      const prescription = await storage.getLatestPublishedPrescriptionForUser(req.user.id);
      if (!prescription) {
        return res.status(404).json({ message: "No published prescription found" });
      }
      res.json(prescription);
    } catch (error) {
      console.error("Error fetching latest prescription for user:", error);
      res.status(500).json({ message: "Failed to fetch latest prescription" });
    }
  });

  // Novo endpoint para buscar TODAS as prescrições publicadas do paciente
  app.get('/api/patient/my-prescriptions', isAuthenticated, async (req: any, res) => {
    try {
      const prescriptions = await storage.getPublishedPrescriptionsForUser(req.user.id);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions for user:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  // --- ROTAS DE HUMOR (NEW) ---
  
  // Buscar registro de humor para um dia específico
  app.get('/api/mood-entries/:prescriptionId/:mealId/:date', isAuthenticated, async (req: any, res) => {
    try {
      const { prescriptionId, mealId, date } = req.params;
      const moodEntry = await storage.getMoodEntry(prescriptionId, mealId, date);
      
      if (!moodEntry) {
        return res.status(404).json({ message: "Mood entry not found" });
      }
      
      res.json(moodEntry);
    } catch (error) {
      console.error("Error fetching mood entry:", error);
      res.status(500).json({ message: "Failed to fetch mood entry" });
    }
  });

  // Criar novo registro de humor
  app.post('/api/mood-entries', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMoodEntrySchema.parse(req.body);
      
      // Verificar se já existe um registro para este dia
      const existingEntry = await storage.getMoodEntry(
        validatedData.prescriptionId,
        validatedData.mealId,
        validatedData.date
      );
      
      if (existingEntry) {
        return res.status(409).json({ 
          message: "Mood entry already exists for this date",
          existingEntry 
        });
      }
      
      const moodEntry = await storage.createMoodEntry(validatedData);
      res.status(201).json(moodEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mood entry data.", errors: error.flatten() });
      }
      console.error("Error creating mood entry:", error);
      res.status(500).json({ message: "Failed to create mood entry" });
    }
  });

  // Atualizar registro de humor existente
  app.put('/api/mood-entries/:id', isAuthenticated, async (req: any, res) => {
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

  // Buscar registros de humor de um paciente
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

  // Buscar registros de humor de uma prescrição
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

  const httpServer = createServer(app);
  return httpServer;
}