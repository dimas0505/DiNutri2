// Arquivo: server/routes.ts

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import { insertPatientSchema, insertPrescriptionSchema, updatePrescriptionSchema } from "../shared/schema.js";
import { z } from "zod";

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

  // --- INVITATION ROUTES (NEW FLOW) ---
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

  app.get('/api/invitations/validate', isAuthenticated, async (req: any, res) => {
    try {
      const token = (req.session as any).invitationToken;
      if (!token) {
        return res.status(400).json({ message: "No invitation token found in session." });
      }
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation token." });
      }
      res.status(200).json({ valid: true });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({ message: "Failed to validate invitation" });
    }
  });

  // --- PATIENT SELF-REGISTRATION ROUTE ---
  app.post('/api/patient/register', isAuthenticated, async (req: any, res) => {
    const token = (req.session as any).invitationToken;
    if (!token) {
      return res.status(400).json({ message: "Missing invitation token." });
    }
    
    try {
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation." });
      }

      const validatedData = insertPatientSchema.parse({
        ...req.body,
        ownerId: invitation.nutritionistId,
        userId: req.user.id,
      });

      const patient = await storage.createPatient(validatedData);
      await storage.updateInvitationStatus(token, 'accepted');

      delete (req.session as any).invitationToken; // Clean up session

      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data.", errors: error.flatten() });
      }
      console.error("Error during patient registration:", error);
      res.status(500).json({ message: "Failed to register patient." });
    }
  });

  // Patient routes (managed by nutritionist)
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

  app.get('/api/patients/:id', isAuthenticated, async (req: any, res) => {
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

  app.put('/api/patients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertPatientSchema.omit({ ownerId: true, userId: true }).partial().parse(req.body);
      const patient = await storage.updatePatient(req.params.id, validatedData);
      res.json(patient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(400).json({ message: "Failed to update patient" });
    }
  });
  
  // Prescription routes
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