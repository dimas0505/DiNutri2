import {
  users,
  patients,
  prescriptions,
  invitations,
  type User,
  type UpsertUser,
  type Patient,
  type InsertPatient,
  type Prescription,
  type InsertPrescription,
  type UpdatePrescription,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: Partial<UpsertUser>): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  updateUserProfile(id: string, profileData: { firstName: string; lastName: string; email: string; role?: string }): Promise<User>;
  deleteUser(id: string): Promise<void>;
  userHasPatients(userId: string): Promise<boolean>;
  userHasPrescriptions(userId: string): Promise<boolean>;
  userHasInvitations(userId: string): Promise<boolean>;
  deleteUserInvitations(userId: string): Promise<void>;
  transferPatients(fromUserId: string, toUserId: string): Promise<void>;
  
  // Patient operations
  getPatientsByOwner(ownerId: string): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient>;
  
  // Invitation operations
  createInvitation(nutritionistId: string): Promise<{ token: string }>;
  getInvitationByToken(token: string): Promise<{ nutritionistId: string } | undefined>;
  updateInvitationStatus(token: string, status: 'accepted'): Promise<void>;

  // Prescription operations
  getPrescriptionsByPatient(patientId: string): Promise<Prescription[]>;
  getPrescription(id: string): Promise<Prescription | undefined>;
  getLatestPublishedPrescription(patientId: string): Promise<Prescription | undefined>;
  getLatestPublishedPrescriptionForUser(userId: string): Promise<Prescription | undefined>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        hashedPassword, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, id));
  }

  async updateUserProfile(id: string, profileData: { firstName: string; lastName: string; email: string; role?: string }): Promise<User> {
    const updateData: any = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      updatedAt: new Date()
    };

    // Só inclui role se foi fornecido
    if (profileData.role) {
      updateData.role = profileData.role;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // Primeiro, verificar se o usuário tem pacientes associados
      if (await this.userHasPatients(id)) {
        throw new Error("Não é possível excluir este usuário pois ele possui pacientes associados. Primeiro transfira ou exclua os pacientes.");
      }

      // Verificar se o usuário tem prescrições associadas
      if (await this.userHasPrescriptions(id)) {
        throw new Error("Não é possível excluir este usuário pois ele possui prescrições associadas.");
      }

      // NOVO: Excluir convites associados ao usuário (se houver)
      if (await this.userHasInvitations(id)) {
        await this.deleteUserInvitations(id);
        console.log(`Deleted invitations for user ${id}`);
      }

      // Se não há dependências críticas, excluir o usuário
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async userHasPatients(userId: string): Promise<boolean> {
    const patientCount = await db
      .select({ count: patients.id })
      .from(patients)
      .where(eq(patients.ownerId, userId));
    
    return patientCount.length > 0;
  }

  async userHasPrescriptions(userId: string): Promise<boolean> {
    const prescriptionCount = await db
      .select({ count: prescriptions.id })
      .from(prescriptions)
      .where(eq(prescriptions.nutritionistId, userId));
    
    return prescriptionCount.length > 0;
  }

  async userHasInvitations(userId: string): Promise<boolean> {
    const invitationCount = await db
      .select({ count: invitations.id })
      .from(invitations)
      .where(eq(invitations.nutritionistId, userId));
    
    return invitationCount.length > 0;
  }

  async deleteUserInvitations(userId: string): Promise<void> {
    await db
      .delete(invitations)
      .where(eq(invitations.nutritionistId, userId));
  }

  async transferPatients(fromUserId: string, toUserId: string): Promise<void> {
    await db
      .update(patients)
      .set({ 
        ownerId: toUserId,
        updatedAt: new Date()
      })
      .where(eq(patients.ownerId, fromUserId));
  }

  async upsertUser(userData: Partial<UpsertUser>): Promise<User> {
    if (!userData.email) {
      throw new Error("Email is required to upsert a user.");
    }
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
  
  // Invitation operations
  async createInvitation(nutritionistId: string): Promise<{ token: string }> {
    const token = randomBytes(32).toString("hex");
    const [newInvitation] = await db
      .insert(invitations)
      .values({ nutritionistId, token })
      .returning({ token: invitations.token });
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<{ nutritionistId: string } | undefined> {
    const [invitation] = await db
      .select({ nutritionistId: invitations.nutritionistId })
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.status, "pending")));
    
    return invitation;
  }

  async updateInvitationStatus(token: string, status: 'accepted'): Promise<void> {
    await db
      .update(invitations)
      .set({ status })
      .where(eq(invitations.token, token));
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

  async getLatestPublishedPrescriptionForUser(userId: string): Promise<Prescription | undefined> {
    // 1. Find the patient profile linked to the user ID
    const [patient] = await db.select({ id: patients.id }).from(patients).where(eq(patients.userId, userId));
    
    // 2. If no patient profile is linked, there are no prescriptions
    if (!patient) {
      return undefined;
    }
    
    // 3. Use the found patient ID to get the latest prescription
    return this.getLatestPublishedPrescription(patient.id);
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