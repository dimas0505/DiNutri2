import {
  users,
  patients,
  prescriptions,
  authorizedNutritionists,
  patientInvitations,
  type User,
  type UpsertUser,
  type Patient,
  type InsertPatient,
  type Prescription,
  type InsertPrescription,
  type UpdatePrescription,
  type AuthorizedNutritionist,
  type InsertAuthorizedNutritionist,
  type PatientInvitation,
  type InsertPatientInvitation,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and, isNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Authorized nutritionist operations
  isAuthorizedNutritionist(email: string): Promise<boolean>;
  createAuthorizedNutritionist(data: InsertAuthorizedNutritionist): Promise<AuthorizedNutritionist>;
  
  // Patient invitation operations
  createPatientInvitation(data: InsertPatientInvitation): Promise<PatientInvitation>;
  getPatientInvitationByToken(token: string): Promise<PatientInvitation | undefined>;
  getValidInvitationByEmail(email: string): Promise<PatientInvitation | undefined>;
  markInvitationAsUsed(token: string): Promise<PatientInvitation>;
  
  // Patient operations
  getPatientsByOwner(ownerId: string): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByEmail(email: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient>;
  
  // Prescription operations
  getPrescriptionsByPatient(patientId: string): Promise<Prescription[]>;
  getPrescription(id: string): Promise<Prescription | undefined>;
  getLatestPublishedPrescription(patientId: string): Promise<Prescription | undefined>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, prescription: UpdatePrescription): Promise<Prescription>;
  publishPrescription(id: string): Promise<Prescription>;
  duplicatePrescription(id: string, title: string): Promise<Prescription>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Authorized nutritionist operations
  async isAuthorizedNutritionist(email: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(authorizedNutritionists)
      .where(eq(authorizedNutritionists.email, email));
    return !!result;
  }

  async createAuthorizedNutritionist(data: InsertAuthorizedNutritionist): Promise<AuthorizedNutritionist> {
    const [nutritionist] = await db
      .insert(authorizedNutritionists)
      .values(data)
      .returning();
    return nutritionist;
  }

  // Patient invitation operations
  async createPatientInvitation(data: InsertPatientInvitation): Promise<PatientInvitation> {
    const [invitation] = await db
      .insert(patientInvitations)
      .values(data)
      .returning();
    return invitation;
  }

  async getPatientInvitationByToken(token: string): Promise<PatientInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(patientInvitations)
      .where(eq(patientInvitations.token, token));
    return invitation;
  }

  async getValidInvitationByEmail(email: string): Promise<PatientInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(patientInvitations)
      .where(
        and(
          eq(patientInvitations.email, email),
          isNull(patientInvitations.usedAt) // Not used yet
        )
      );
    
    // Check if invitation is not expired
    if (invitation && new Date() <= invitation.expiresAt) {
      return invitation;
    }
    
    return undefined;
  }

  async markInvitationAsUsed(token: string): Promise<PatientInvitation> {
    const [invitation] = await db
      .update(patientInvitations)
      .set({ usedAt: new Date() })
      .where(eq(patientInvitations.token, token))
      .returning();
    return invitation;
  }

  // Patient operations
  async getPatientsByOwner(ownerId: string): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(eq(patients.ownerId, ownerId))
      .orderBy(desc(patients.createdAt));
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientByEmail(email: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.email, email));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient> {
    const [updatedPatient] = await db
      .update(patients)
      .set({ ...patient, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return updatedPatient;
  }

  // Prescription operations
  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, patientId))
      .orderBy(desc(prescriptions.createdAt));
  }

  async getPrescription(id: string): Promise<Prescription | undefined> {
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.id, id));
    return prescription;
  }

  async getLatestPublishedPrescription(patientId: string): Promise<Prescription | undefined> {
    const [prescription] = await db
      .select()
      .from(prescriptions)
      .where(
        and(
          eq(prescriptions.patientId, patientId),
          eq(prescriptions.status, "published")
        )
      )
      .orderBy(desc(prescriptions.publishedAt))
      .limit(1);
    return prescription;
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const [newPrescription] = await db
      .insert(prescriptions)
      .values({
        ...prescription,
        meals: prescription.meals as any, // Type assertion for JSONB field
      })
      .returning();
    return newPrescription;
  }

  async updatePrescription(id: string, prescription: UpdatePrescription): Promise<Prescription> {
    const [updatedPrescription] = await db
      .update(prescriptions)
      .set({ 
        ...prescription, 
        updatedAt: new Date(),
        meals: prescription.meals as any // Type assertion for JSONB field
      })
      .where(eq(prescriptions.id, id))
      .returning();
    return updatedPrescription;
  }

  async publishPrescription(id: string): Promise<Prescription> {
    const [publishedPrescription] = await db
      .update(prescriptions)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(prescriptions.id, id))
      .returning();
    return publishedPrescription;
  }

  async duplicatePrescription(id: string, title: string): Promise<Prescription> {
    const original = await this.getPrescription(id);
    if (!original) {
      throw new Error("Prescription not found");
    }

    const [duplicated] = await db
      .insert(prescriptions)
      .values({
        patientId: original.patientId,
        nutritionistId: original.nutritionistId,
        title,
        status: "draft",
        meals: original.meals as any, // Type assertion for JSONB field
        generalNotes: original.generalNotes,
      })
      .returning();
    return duplicated;
  }
}

export const storage = new DatabaseStorage();