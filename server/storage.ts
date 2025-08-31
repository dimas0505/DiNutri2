import {
  users,
  patients,
  prescriptions,
  invitations,
  moodEntries,
  type User,
  type UpsertUser,
  type Patient,
  type InsertPatient,
  type Prescription,
  type InsertPrescription,
  type UpdatePrescription,
  type MoodEntry,
  type InsertMoodEntry,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { randomBytes } from "crypto";
import { nanoid } from "nanoid";

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
  getPublishedPrescriptionsForUser(userId: string): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: string, prescription: UpdatePrescription): Promise<Prescription>;
  publishPrescription(id: string): Promise<Prescription>;
  duplicatePrescription(id: string, title: string): Promise<Prescription>;
  deletePrescription(id: string): Promise<void>;

  // Mood operations (NEW)
  getMoodEntry(prescriptionId: string, mealId: string, date: string): Promise<MoodEntry | undefined>;
  createMoodEntry(moodEntry: InsertMoodEntry): Promise<MoodEntry>;
  updateMoodEntry(id: string, moodEntry: Partial<InsertMoodEntry>): Promise<MoodEntry>;
  getMoodEntriesByPatient(patientId: string, startDate?: string, endDate?: string): Promise<MoodEntry[]>;
  getMoodEntriesByPrescription(prescriptionId: string): Promise<MoodEntry[]>;
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
    // CORRIGIDO: Garantir que email seja sempre uma string válida
    if (!userData.email) {
      throw new Error("Email is required to upsert a user.");
    }
    
    // Criar objeto com tipos corretos, garantindo que email seja string
    const userWithId = {
      id: nanoid(),
      email: userData.email, // Já validado acima
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      role: userData.role ?? "patient" as const,
      hashedPassword: userData.hashedPassword ?? null,
    };
    
    const [user] = await db
      .insert(users)
      .values(userWithId)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          firstName: userData.firstName ?? null,
          lastName: userData.lastName ?? null,
          profileImageUrl: userData.profileImageUrl ?? null,
          role: userData.role ?? "patient" as const,
          hashedPassword: userData.hashedPassword ?? null,
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
    const patientWithId = {
      id: nanoid(),
      ...patient,
    };
    
    const [newPatient] = await db.insert(patients).values(patientWithId).returning();
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
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias
    
    const invitationWithId = {
      id: nanoid(),
      nutritionistId,
      token,
      email: "placeholder@email.com", // Email temporário, será atualizado quando o paciente se registrar
      expiresAt,
    };
    
    const [newInvitation] = await db
      .insert(invitations)
      .values(invitationWithId)
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
    const [patient] = await db.select({ id: patients.id }).from(patients).where(eq(patients.userId, userId));
    if (!patient) return undefined;
    return this.getLatestPublishedPrescription(patient.id);
  }

  async getPublishedPrescriptionsForUser(userId: string): Promise<Prescription[]> {
    const [patient] = await db.select({ id: patients.id }).from(patients).where(eq(patients.userId, userId));
    if (!patient) {
      return [];
    }
    return await db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.patientId, patient.id), eq(prescriptions.status, "published")))
      .orderBy(desc(prescriptions.publishedAt));
  }

  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const prescriptionWithId = {
      id: nanoid(),
      ...prescription,
      meals: prescription.meals as any, // Type assertion for JSONB field
    };
    
    const [newPrescription] = await db
      .insert(prescriptions)
      .values(prescriptionWithId)
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

    const duplicatedWithId = {
      id: nanoid(),
      patientId: original.patientId,
      nutritionistId: original.nutritionistId,
      title,
      status: "draft" as const,
      meals: original.meals as any, // Type assertion for JSONB field
      generalNotes: original.generalNotes,
    };

    const [duplicated] = await db
      .insert(prescriptions)
      .values(duplicatedWithId)
      .returning();
    return duplicated;
  }

  async deletePrescription(id: string): Promise<void> {
    await db.delete(prescriptions).where(eq(prescriptions.id, id));
  }

  // Mood operations (NEW)
  async getMoodEntry(prescriptionId: string, mealId: string, date: string): Promise<MoodEntry | undefined> {
    const [moodEntry] = await db
      .select()
      .from(moodEntries)
      .where(
        and(
          eq(moodEntries.prescriptionId, prescriptionId),
          eq(moodEntries.mealId, mealId),
          eq(moodEntries.date, date)
        )
      );
    return moodEntry;
  }

  async createMoodEntry(moodEntry: InsertMoodEntry): Promise<MoodEntry> {
    const moodEntryWithId = {
      id: nanoid(),
      ...moodEntry,
    };
    
    const [newMoodEntry] = await db
      .insert(moodEntries)
      .values(moodEntryWithId)
      .returning();
    return newMoodEntry;
  }

  async updateMoodEntry(id: string, moodEntry: Partial<InsertMoodEntry>): Promise<MoodEntry> {
    const [updatedMoodEntry] = await db
      .update(moodEntries)
      .set({ 
        ...moodEntry, 
        updatedAt: new Date() 
      })
      .where(eq(moodEntries.id, id))
      .returning();
    return updatedMoodEntry;
  }

  async getMoodEntriesByPatient(patientId: string, startDate?: string, endDate?: string): Promise<MoodEntry[]> {
    let whereConditions = [eq(moodEntries.patientId, patientId)];

    if (startDate && endDate) {
      whereConditions.push(gte(moodEntries.date, startDate));
      whereConditions.push(lte(moodEntries.date, endDate));
    } else if (startDate) {
      whereConditions.push(eq(moodEntries.date, startDate));
    }

    return await db
      .select()
      .from(moodEntries)
      .where(and(...whereConditions))
      .orderBy(desc(moodEntries.createdAt));
  }

  async getMoodEntriesByPrescription(prescriptionId: string): Promise<MoodEntry[]> {
    return await db
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.prescriptionId, prescriptionId))
      .orderBy(desc(moodEntries.date), desc(moodEntries.createdAt));
  }
}

export const storage = new DatabaseStorage();