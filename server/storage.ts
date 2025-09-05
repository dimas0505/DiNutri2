import {
  users,
  patients,
  prescriptions,
  invitations,
  moodEntries,
  anamnesisRecords,
  foodDiaryEntries,
  type User,
  type UpsertUser,
  type Patient,
  type InsertPatient,
  type Prescription,
  type InsertPrescription,
  type UpdatePrescription,
  type MoodEntry,
  type InsertMoodEntry,
  type AnamnesisRecord,
  type FoodDiaryEntry,
  type FoodDiaryEntryWithPrescription,
  type InsertFoodDiaryEntry,
  insertAnamnesisRecordSchema,
  insertFoodDiaryEntrySchema,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and, gte, lte, sql, SQL } from "drizzle-orm";
import { randomBytes } from "crypto";
import { nanoid } from "nanoid";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

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
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  createPatientFromInvitation(data: any): Promise<User>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient>;
  
  // Invitation operations
  createInvitation(nutritionistId: string): Promise<{ token: string }>;
  getInvitationByToken(token: string): Promise<{ nutritionistId: string, status: string } | undefined>;
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

  // Anamnesis Record operations
  createAnamnesisRecord(record: any): Promise<AnamnesisRecord>;
  getAnamnesisRecords(patientId: string): Promise<AnamnesisRecord[]>;

  // Food Diary operations
  createFoodDiaryEntry(entry: InsertFoodDiaryEntry): Promise<FoodDiaryEntry>;
  getFoodDiaryEntriesByPatient(patientId: string): Promise<FoodDiaryEntryWithPrescription[]>;
}

export class DatabaseStorage implements IStorage {
  // Helper function to normalize patient data
  private normalizePatientData(patient: Partial<Patient>): Patient {
    return {
      ...patient,
      id: patient.id!,
      ownerId: patient.ownerId!,
      userId: patient.userId ?? null,
      name: patient.name!,
      email: patient.email ?? null,
      birthDate: patient.birthDate ?? null,
      sex: patient.sex ?? null,
      heightCm: patient.heightCm ?? null,
      weightKg: patient.weightKg ?? null,
      notes: patient.notes ?? null,
      goal: patient.goal ?? null,
      activityLevel: patient.activityLevel ?? null,
      likedHealthyFoods: patient.likedHealthyFoods || [],
      dislikedFoods: patient.dislikedFoods || [],
      hasIntolerance: patient.hasIntolerance ?? null,
      intolerances: patient.intolerances || [],
      canEatMorningSolids: patient.canEatMorningSolids ?? null,
      mealsPerDayCurrent: patient.mealsPerDayCurrent ?? null,
      mealsPerDayWilling: patient.mealsPerDayWilling ?? null,
      alcoholConsumption: patient.alcoholConsumption ?? null,
      supplements: patient.supplements ?? null,
      diseases: patient.diseases ?? null,
      medications: patient.medications ?? null,
      biotype: patient.biotype ?? null,
      createdAt: patient.createdAt ?? new Date(),
      updatedAt: patient.updatedAt ?? new Date(),
    };
  }

  // Helper functions for prescription expiration (temporarily disabled until migration is applied)
  private isExpired(prescription: Prescription): boolean {
    return false; // Disabled until expiresAt column exists
  }

  private isExpiringWithin7Days(prescription: Prescription): boolean {
    return false; // Disabled until expiresAt column exists
  }

  private getDaysUntilExpiration(prescription: Prescription): number | null {
    return null; // Disabled until expiresAt column exists
  }

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
      if (await this.userHasPatients(id)) {
        throw new Error("Não é possível excluir este usuário pois ele possui pacientes associados. Primeiro transfira ou exclua os pacientes.");
      }
      if (await this.userHasPrescriptions(id)) {
        throw new Error("Não é possível excluir este usuário pois ele possui prescrições associadas.");
      }
      if (await this.userHasInvitations(id)) {
        await this.deleteUserInvitations(id);
      }
      await db.delete(users).where(eq(users.id, id));
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  async userHasPatients(userId: string): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(eq(patients.ownerId, userId));
    return result[0].count > 0;
  }

  async userHasPrescriptions(userId: string): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(prescriptions)
      .where(eq(prescriptions.nutritionistId, userId));
    return result[0].count > 0;
  }

  async userHasInvitations(userId: string): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(invitations)
      .where(eq(invitations.nutritionistId, userId));
    return result[0].count > 0;
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
    const userWithId = {
      id: nanoid(),
      email: userData.email,
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
    const patientList = await db
      .select()
      .from(patients)
      .where(eq(patients.ownerId, ownerId))
      .orderBy(desc(patients.createdAt));
    return patientList.map(p => this.normalizePatientData(p));
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient ? this.normalizePatientData(patient) : undefined;
  }

  async getPatientByUserId(userId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.userId, userId));
    return patient ? this.normalizePatientData(patient) : undefined;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const patientWithId = {
      id: nanoid(),
      ...patient,
    };
    try {
      const [newPatient] = await db.insert(patients).values(patientWithId).returning();
      return this.normalizePatientData(newPatient);
    } catch (error: any) {
      if (error.code === '42703') { // PostgreSQL error for undefined column
        console.warn("Schema mismatch detected. Creating patient with legacy fields.");
        const legacyPatientData = (({ goal, activityLevel, likedHealthyFoods, dislikedFoods, hasIntolerance, intolerances, canEatMorningSolids, mealsPerDayCurrent, mealsPerDayWilling, alcoholConsumption, supplements, diseases, medications, biotype, ...rest }) => rest)(patientWithId);
        const [newPatient] = await db.insert(patients).values(legacyPatientData).returning();
        return this.normalizePatientData(newPatient);
      }
      throw error;
    }
  }

  async createPatientFromInvitation(data: any): Promise<User> {
    const invitation = await this.getInvitationByToken(data.token);
    if (!invitation || invitation.status !== 'pending') {
      throw new Error("Convite inválido ou já utilizado.");
    }
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error("409: Conflict - Email já cadastrado.");
    }
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    const newUser = await this.upsertUser({
      email: data.email,
      firstName: data.name.split(' ')[0],
      lastName: data.name.split(' ').slice(1).join(' '),
      hashedPassword: hashedPassword,
      role: "patient",
    });
    await this.createPatient({
      ...data,
      ownerId: invitation.nutritionistId,
      userId: newUser.id,
    });
    await this.updateInvitationStatus(data.token, 'accepted');
    return newUser;
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient> {
    const updateData = { ...patient, updatedAt: new Date() };
    try {
      const [updatedPatient] = await db.update(patients).set(updateData).where(eq(patients.id, id)).returning();
      return this.normalizePatientData(updatedPatient);
    } catch (error: any) {
      if (error.code === '42703') {
        console.warn("Schema mismatch detected. Updating patient with legacy fields.");
        const legacyPatientData = (({ goal, activityLevel, likedHealthyFoods, dislikedFoods, hasIntolerance, intolerances, canEatMorningSolids, mealsPerDayCurrent, mealsPerDayWilling, alcoholConsumption, supplements, diseases, medications, biotype, ...rest }) => rest)(updateData);
        const [updatedPatient] = await db.update(patients).set(legacyPatientData).where(eq(patients.id, id)).returning();
        return this.normalizePatientData(updatedPatient);
      }
      throw error;
    }
  }
  
  // Invitation operations
  async createInvitation(nutritionistId: string): Promise<{ token: string }> {
    try {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const invitationWithId = {
        id: nanoid(),
        nutritionistId,
        token,
        email: "placeholder@email.com",
        role: "patient" as const,
        expiresAt,
      };
      const [newInvitation] = await db.insert(invitations).values(invitationWithId).returning({ token: invitations.token });
      if (!newInvitation) {
        throw new Error("Falha ao criar o convite.");
      }
      return newInvitation;
    } catch (error) {
      console.error("Erro em createInvitation:", error);
      throw new Error("Não foi possível criar o convite.");
    }
  }

  async getInvitationByToken(token: string): Promise<{ nutritionistId: string, status: string } | undefined> {
    const [invitation] = await db
      .select({ nutritionistId: invitations.nutritionistId, status: invitations.status })
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.status, "pending")));
    return invitation as { nutritionistId: string, status: string } | undefined;
  }

  async updateInvitationStatus(token: string, status: 'accepted'): Promise<void> {
    await db
      .update(invitations)
      .set({ status, used: true })
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
      .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.status, "published")))
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
    const patient = await this.getPatientByUserId(userId);
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
      meals: prescription.meals as any,
    };
    const [newPrescription] = await db.insert(prescriptions).values(prescriptionWithId).returning();
    return newPrescription;
  }

  async updatePrescription(id: string, prescription: UpdatePrescription): Promise<Prescription> {
    const [updatedPrescription] = await db
      .update(prescriptions)
      .set({ ...prescription, updatedAt: new Date(), meals: prescription.meals as any })
      .where(eq(prescriptions.id, id))
      .returning();
    return updatedPrescription;
  }

  async publishPrescription(id: string): Promise<Prescription> {
    const [publishedPrescription] = await db
      .update(prescriptions)
      .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(prescriptions.id, id))
      .returning();
    return publishedPrescription;
  }

  async duplicatePrescription(id: string, title: string): Promise<Prescription> {
    const original = await this.getPrescription(id);
    if (!original) throw new Error("Prescription not found");
    const duplicatedWithId = {
      id: nanoid(),
      patientId: original.patientId,
      nutritionistId: original.nutritionistId,
      title,
      status: "draft" as const,
      meals: original.meals as any,
      generalNotes: original.generalNotes,
    };
    const [duplicated] = await db.insert(prescriptions).values(duplicatedWithId).returning();
    return duplicated;
  }

  async deletePrescription(id: string): Promise<void> {
    await db.delete(prescriptions).where(eq(prescriptions.id, id));
  }

  // Mood operations
  async getMoodEntry(prescriptionId: string, mealId: string, date: string): Promise<MoodEntry | undefined> {
    const [moodEntry] = await db.select().from(moodEntries).where(and(eq(moodEntries.prescriptionId, prescriptionId), eq(moodEntries.mealId, mealId), eq(moodEntries.date, date)));
    return moodEntry as MoodEntry | undefined;
  }

  async createMoodEntry(moodEntry: InsertMoodEntry): Promise<MoodEntry> {
    const moodEntryWithId = { id: nanoid(), ...moodEntry };
    const [newMoodEntry] = await db.insert(moodEntries).values(moodEntryWithId).returning();
    return newMoodEntry as MoodEntry;
  }

  async updateMoodEntry(id: string, moodEntry: Partial<InsertMoodEntry>): Promise<MoodEntry> {
    const [updatedMoodEntry] = await db.update(moodEntries).set({ ...moodEntry, updatedAt: new Date() }).where(eq(moodEntries.id, id)).returning();
    return updatedMoodEntry as MoodEntry;
  }

  async getMoodEntriesByPatient(patientId: string, startDate?: string, endDate?: string): Promise<MoodEntry[]> {
    let whereConditions: SQL[] = [eq(moodEntries.patientId, patientId)];
    if (startDate) {
      whereConditions.push(gte(moodEntries.date, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(moodEntries.date, endDate));
    }

    const result = await db
      .select()
      .from(moodEntries)
      .where(and(...whereConditions))
      .orderBy(desc(moodEntries.createdAt));
      
    return result as MoodEntry[];
  }

  async getMoodEntriesByPrescription(prescriptionId: string): Promise<MoodEntry[]> {
    const result = await db
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.prescriptionId, prescriptionId))
      .orderBy(desc(moodEntries.date), desc(moodEntries.createdAt));
      
    return result as MoodEntry[];
  }

  async createAnamnesisRecord(record: any): Promise<AnamnesisRecord> {
    const recordWithId = { id: nanoid(), ...record };
    const [newRecord] = await db.insert(anamnesisRecords).values(recordWithId).returning();
    return newRecord;
  }

  async getAnamnesisRecords(patientId: string): Promise<AnamnesisRecord[]> {
    return await db
      .select()
      .from(anamnesisRecords)
      .where(eq(anamnesisRecords.patientId, patientId))
      .orderBy(desc(anamnesisRecords.createdAt));
  }

  async createFoodDiaryEntry(entry: InsertFoodDiaryEntry): Promise<FoodDiaryEntry> {
    const entryWithId = { id: nanoid(), ...entry };
    const [newEntry] = await db.insert(foodDiaryEntries).values(entryWithId).returning();
    return newEntry;
  }

  async getFoodDiaryEntriesByPatient(patientId: string): Promise<FoodDiaryEntryWithPrescription[]> {
    const entries = await db.select({
      id: foodDiaryEntries.id,
      patientId: foodDiaryEntries.patientId,
      prescriptionId: foodDiaryEntries.prescriptionId,
      mealId: foodDiaryEntries.mealId,
      imageUrl: foodDiaryEntries.imageUrl,
      notes: foodDiaryEntries.notes,
      date: foodDiaryEntries.date,
      createdAt: foodDiaryEntries.createdAt,
      prescriptionTitle: prescriptions.title,
      prescriptionMeals: prescriptions.meals,
      moodBefore: moodEntries.moodBefore,
      moodAfter: moodEntries.moodAfter,
      moodNotes: moodEntries.notes,
    })
      .from(foodDiaryEntries)
      .leftJoin(prescriptions, eq(foodDiaryEntries.prescriptionId, prescriptions.id))
      .leftJoin(moodEntries, and(
        eq(foodDiaryEntries.patientId, moodEntries.patientId),
        eq(foodDiaryEntries.prescriptionId, moodEntries.prescriptionId),
        eq(foodDiaryEntries.mealId, moodEntries.mealId),
        eq(foodDiaryEntries.date, moodEntries.date)
      ))
      .where(eq(foodDiaryEntries.patientId, patientId))
      .orderBy(desc(foodDiaryEntries.createdAt));
    
    return entries.map(entry => ({
      id: entry.id,
      patientId: entry.patientId,
      prescriptionId: entry.prescriptionId,
      mealId: entry.mealId,
      imageUrl: entry.imageUrl,
      notes: entry.notes,
      date: entry.date,
      createdAt: entry.createdAt,
      prescriptionTitle: entry.prescriptionTitle,
      prescriptionMeals: entry.prescriptionMeals,
      moodBefore: entry.moodBefore,
      moodAfter: entry.moodAfter,
      moodNotes: entry.moodNotes,
    })) as any[];
  }
}

export const storage = new DatabaseStorage();