// Arquivo: server/routes.ts

import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import bcrypt from "bcrypt";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import { insertPatientSchema, insertPrescriptionSchema, updatePrescriptionSchema } from "../shared/schema.js";
import { z } from "zod";

const SALT_ROUNDS = 10;

export async function registerRoutes(app: Express): Promise<Server> {
  // Configura a nova estratégia de autenticação (passport-local)
  await setupAuth(app);

  // --- NOVAS ROTAS DE AUTENTICAÇÃO ---
  app.post('/api/login', passport.authenticate('local'), (req, res) => {
    // Se a autenticação for bem-sucedida, o Passport anexa `req.user`.
    // Apenas retornamos o usuário para o frontend.
    res.json(req.user);
  });

  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      // Destrói a sessão e limpa o cookie do navegador
      req.session.destroy(() => {
        res.clearCookie('connect.sid'); 
        res.status(200).json({ message: "Logout successful" });
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

      const existingUser = await storage.getUserByEmail(patientData.email);
      if (existingUser) {
        return res.status(409).json({ message: "Este email já está em uso." });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser = await storage.upsertUser({
        email: patientData.email,
        firstName: patientData.name.split(' ')[0],
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
      
      const existingUser = await storage.getUserByEmail(patientData.email);
      if (existingUser) {
        return res.status(409).json({ message: "Este email já está em uso." });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser = await storage.upsertUser({
        email: patientData.email,
        firstName: patientData.name.split(' ')[0],
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
  
  // --- ROTAS DE PRESCRIÇÃO (sem alterações) ---
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

  const httpServer = createServer(app);
  return httpServer;
}