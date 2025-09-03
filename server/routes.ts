import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import bcrypt from "bcrypt";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import { insertPatientSchema, insertPrescriptionSchema, updatePrescriptionSchema, insertMoodEntrySchema } from "../shared/schema.js";
import { z } from "zod";

const SALT_ROUNDS = 10;

// Middleware to check if the user is an admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

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

  return createServer(app);
}