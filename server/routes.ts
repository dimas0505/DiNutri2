// Arquivo: server/routes.ts

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated, requireNutritionist, requirePatient } from "./auth.js";
import { insertPatientSchema, insertPrescriptionSchema, updatePrescriptionSchema } from "../shared/schema.js";
import { z } from "zod";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Patient routes - require nutritionist role
  app.get('/api/patients', requireNutritionist, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const patients = await storage.getPatientsByOwner(userId);
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.post('/api/patients', requireNutritionist, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertPatientSchema.parse({
        ...req.body,
        ownerId: userId,
      });
      const patient = await storage.createPatient(validatedData);
      res.json(patient);
    } catch (error) {
      // --- BLOCO DE ERRO MELHORADO ---
      if (error instanceof z.ZodError) {
        console.error("Zod validation error:", error.flatten());
        return res.status(400).json({ message: "Dados inválidos.", errors: error.flatten() });
      }
      console.error("Error creating patient:", error);
      res.status(400).json({ message: "Failed to create patient" });
      // --- FIM DA MELHORIA ---
    }
  });

  app.get('/api/patients/:id', requireNutritionist, async (req: any, res) => {
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

  app.put('/api/patients/:id', requireNutritionist, async (req: any, res) => {
    try {
      const validatedData = insertPatientSchema.omit({ ownerId: true }).parse(req.body);
      const patient = await storage.updatePatient(req.params.id, validatedData);
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(400).json({ message: "Failed to update patient" });
    }
  });

  // Patient invitation routes
  app.post('/api/invitations', requireNutritionist, async (req: any, res) => {
    try {
      const nutritionistId = req.user.id;
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const invitation = await storage.createPatientInvitation({
        nutritionistId,
        email,
        token,
        expiresAt,
      });

      res.json({ 
        message: "Invitation created successfully",
        token: invitation.token,
        invitationUrl: `${process.env.BASE_URL}/invite/${invitation.token}`
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.get('/api/invitations/validate/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getPatientInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.usedAt) {
        return res.status(400).json({ message: "Invitation has already been used" });
      }

      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      res.json({ 
        valid: true,
        email: invitation.email,
        nutritionistId: invitation.nutritionistId
      });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({ message: "Failed to validate invitation" });
    }
  });

  app.post('/api/invitations/accept/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const invitation = await storage.getPatientInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      if (invitation.usedAt) {
        return res.status(400).json({ message: "Invitation has already been used" });
      }

      if (new Date() > invitation.expiresAt) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Mark invitation as used
      await storage.markInvitationAsUsed(token);

      // TODO: Implement patient account creation via invitation
      // This would involve integrating with Auth0 to create the patient account
      
      res.json({ 
        message: "Invitation accepted successfully",
        redirectTo: "/api/login" // Redirect to login to complete the process
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Patient portal routes - for patients to view their own data
  app.get('/api/patient/profile', requirePatient, async (req: any, res) => {
    try {
      const userEmail = req.user.email;
      const patient = await storage.getPatientByEmail(userEmail);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }
      
      res.json(patient);
    } catch (error) {
      console.error("Error fetching patient profile:", error);
      res.status(500).json({ message: "Failed to fetch patient profile" });
    }
  });

  app.get('/api/patient/prescriptions', requirePatient, async (req: any, res) => {
    try {
      const userEmail = req.user.email;
      const patient = await storage.getPatientByEmail(userEmail);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }
      
      const prescriptions = await storage.getPrescriptionsByPatient(patient.id);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching patient prescriptions:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  app.get('/api/patient/latest-prescription', requirePatient, async (req: any, res) => {
    try {
      const userEmail = req.user.email;
      const patient = await storage.getPatientByEmail(userEmail);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient profile not found" });
      }
      
      const prescription = await storage.getLatestPublishedPrescription(patient.id);
      if (!prescription) {
        return res.status(404).json({ message: "No published prescription found" });
      }
      
      res.json(prescription);
    } catch (error) {
      console.error("Error fetching latest prescription:", error);
      res.status(500).json({ message: "Failed to fetch latest prescription" });
    }
  });

  // Prescription routes (require nutritionist role for creation/modification)
  app.get('/api/patients/:patientId/prescriptions', requireNutritionist, async (req, res) => {
    try {
      const prescriptions = await storage.getPrescriptionsByPatient(req.params.patientId);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
  });

  app.post('/api/prescriptions', requireNutritionist, async (req: any, res) => {
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

  app.get('/api/prescriptions/:id', requireNutritionist, async (req, res) => {
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

  app.put('/api/prescriptions/:id', requireNutritionist, async (req, res) => {
    try {
      const validatedData = updatePrescriptionSchema.parse(req.body);
      const prescription = await storage.updatePrescription(req.params.id, validatedData);
      res.json(prescription);
    } catch (error) {
      console.error("Error updating prescription:", error);
      res.status(400).json({ message: "Failed to update prescription" });
    }
  });

  app.post('/api/prescriptions/:id/publish', requireNutritionist, async (req, res) => {
    try {
      const prescription = await storage.publishPrescription(req.params.id);
      res.json(prescription);
    } catch (error) {
      console.error("Error publishing prescription:", error);
      res.status(500).json({ message: "Failed to publish prescription" });
    }
  });

  app.post('/api/prescriptions/:id/duplicate', requireNutritionist, async (req, res) => {
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

  app.get('/api/patients/:patientId/latest-prescription', requireNutritionist, async (req, res) => {
    try {
      const prescription = await storage.getLatestPublishedPrescription(req.params.patientId);
      if (!prescription) {
        return res.status(404).json({ message: "No published prescription found" });
      }
      res.json(prescription);
    } catch (error) {
      console.error("Error fetching latest prescription:", error);
      res.status(500).json({ message: "Failed to fetch latest prescription" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}