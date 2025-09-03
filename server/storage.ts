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
  getPatientByUserId(userId: string): Promise<Patient | undefined>;
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
  // Helper function to normalize patient data
  private normalizePatientData(patient: Patient): Patient {
    return {
      ...patient,
      likedHealthyFoods: patient.likedHealthyFoods || [],
      dislikedFoods: patient.dislikedFoods || [],
      intolerances: patient.intolerances || [],
    };
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
    try {
      // Try with full schema first, fallback to basic columns if new columns don't exist
      const patientList = await db
        .select()
        .from(patients)
        .where(eq(patients.ownerId, ownerId))
        .orderBy(desc(patients.createdAt));
      
      return patientList.map((patient: Patient) => this.normalizePatientData(patient));
    } catch (error: any) {
      if (error.message?.includes('column "goal" does not exist')) {
        console.log("New anamnese columns don't exist, using legacy patient schema");
        
        // Fallback to basic columns only
        const basicPatientList = await db
          .select({
            id: patients.id,
            ownerId: patients.ownerId,
            userId: patients.userId,
            name: patients.name,
            email: patients.email,
            birthDate: patients.birthDate,
            sex: patients.sex,
            heightCm: patients.heightCm,
            weightKg: patients.weightKg,
            notes: patients.notes,
            createdAt: patients.createdAt,
            updatedAt: patients.updatedAt,
          })
          .from(patients)
          .where(eq(patients.ownerId, ownerId))
          .orderBy(desc(patients.createdAt));
        
        // Convert to full patient objects with defaults for missing fields
        return basicPatientList.map((patient: any) => this.normalizePatientData({
          ...patient,
          goal: null,
          activityLevel: null,
          likedHealthyFoods: [],
          dislikedFoods: [],
          hasIntolerance: null,
          intolerances: [],
          canEatMorningSolids: null,
          mealsPerDayCurrent: null,
          mealsPerDayWilling: null,
          alcoholConsumption: null,
          supplements: null,
          diseases: null,
          medications: null,
          biotype: null,
        }));
      }
      throw error;
    }
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    try {
      const [patient] = await db.select().from(patients).where(eq(patients.id, id));
      return patient ? this.normalizePatientData(patient) : undefined;
    } catch (error: any) {
      if (error.message?.includes('column "goal" does not exist')) {
        console.log("New anamnese columns don't exist, using legacy patient schema for getPatient");
        
        const [basicPatient] = await db
          .select({
            id: patients.id,
            ownerId: patients.ownerId,
            userId: patients.userId,
            name: patients.name,
            email: patients.email,
            birthDate: patients.birthDate,
            sex: patients.sex,
            heightCm: patients.heightCm,
            weightKg: patients.weightKg,
            notes: patients.notes,
            createdAt: patients.createdAt,
            updatedAt: patients.updatedAt,
          })
          .from(patients)
          .where(eq(patients.id, id));
        
        if (!basicPatient) return undefined;
        
        return this.normalizePatientData({
          ...basicPatient,
          goal: null,
          activityLevel: null,
          likedHealthyFoods: [],
          dislikedFoods: [],
          hasIntolerance: null,
          intolerances: [],
          canEatMorningSolids: null,
          mealsPerDayCurrent: null,
          mealsPerDayWilling: null,
          alcoholConsumption: null,
          supplements: null,
          diseases: null,
          medications: null,
          biotype: null,
        });
      }
      throw error;
    }
  }

  async getPatientByUserId(userId: string): Promise<Patient | undefined> {
    try {
      const [patient] = await db.select().from(patients).where(eq(patients.userId, userId));
      return patient ? this.normalizePatientData(patient) : undefined;
    } catch (error: any) {
      if (error.message?.includes('column "goal" does not exist')) {
        console.log("New anamnese columns don't exist, using legacy patient schema for getPatientByUserId");
        
        const [basicPatient] = await db
          .select({
            id: patients.id,
            ownerId: patients.ownerId,
            userId: patients.userId,
            name: patients.name,
            email: patients.email,
            birthDate: patients.birthDate,
            sex: patients.sex,
            heightCm: patients.heightCm,
            weightKg: patients.weightKg,
            notes: patients.notes,
            createdAt: patients.createdAt,
            updatedAt: patients.updatedAt,
          })
          .from(patients)
          .where(eq(patients.userId, userId));
        
        if (!basicPatient) return undefined;
        
        return this.normalizePatientData({
          ...basicPatient,
          goal: null,
          activityLevel: null,
          likedHealthyFoods: [],
          dislikedFoods: [],
          hasIntolerance: null,
          intolerances: [],
          canEatMorningSolids: null,
          mealsPerDayCurrent: null,
          mealsPerDayWilling: null,
          alcoholConsumption: null,
          supplements: null,
          diseases: null,
          medications: null,
          biotype: null,
        });
      }
      throw error;
    }
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    try {
      const patientWithId = {
        id: nanoid(),
        ...patient,
        // Ensure arrays have proper defaults
        likedHealthyFoods: patient.likedHealthyFoods || [],
        dislikedFoods: patient.dislikedFoods || [],
        intolerances: patient.intolerances || [],
      };
      
      const [newPatient] = await db.insert(patients).values(patientWithId).returning();
      return this.normalizePatientData(newPatient);
    } catch (error: any) {
      if (error.message?.includes('column "goal" does not exist') || 
          error.message?.includes('column "liked_healthy_foods" does not exist')) {
        console.log("New anamnese columns don't exist, using legacy patient creation");
        
        // Create with only basic fields that exist in legacy schema
        const basicPatientData = {
          id: nanoid(),
          ownerId: patient.ownerId,
          userId: patient.userId,
          name: patient.name,
          email: patient.email,
          birthDate: patient.birthDate,
          sex: patient.sex,
          heightCm: patient.heightCm,
          weightKg: patient.weightKg,
          notes: patient.notes,
        };
        
        const [newPatient] = await db.insert(patients).values(basicPatientData).returning();
        return this.normalizePatientData({
          ...newPatient,
          goal: null,
          activityLevel: null,
          likedHealthyFoods: [],
          dislikedFoods: [],
          hasIntolerance: null,
          intolerances: [],
          canEatMorningSolids: null,
          mealsPerDayCurrent: null,
          mealsPerDayWilling: null,
          alcoholConsumption: null,
          supplements: null,
          diseases: null,
          medications: null,
          biotype: null,
        });
      }
      throw error;
    }
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient> {
    try {
      const updateData = {
        ...patient,
        updatedAt: new Date(),
        // Ensure arrays have proper defaults if provided
        ...(patient.likedHealthyFoods !== undefined && { likedHealthyFoods: patient.likedHealthyFoods || [] }),
        ...(patient.dislikedFoods !== undefined && { dislikedFoods: patient.dislikedFoods || [] }),
        ...(patient.intolerances !== undefined && { intolerances: patient.intolerances || [] }),
      };
      
      const [updatedPatient] = await db
        .update(patients)
        .set(updateData)
        .where(eq(patients.id, id))
        .returning();
      return this.normalizePatientData(updatedPatient);
    } catch (error: any) {
      if (error.message?.includes('column "goal" does not exist') || 
          error.message?.includes('column "liked_healthy_foods" does not exist')) {
        console.log("New anamnese columns don't exist, using legacy patient update");
        
        // Update with only basic fields that exist in legacy schema
        const basicUpdateData: any = {
          updatedAt: new Date(),
        };
        
        // Only include basic fields that exist in legacy schema
        if (patient.name !== undefined) basicUpdateData.name = patient.name;
        if (patient.email !== undefined) basicUpdateData.email = patient.email;
        if (patient.birthDate !== undefined) basicUpdateData.birthDate = patient.birthDate;
        if (patient.sex !== undefined) basicUpdateData.sex = patient.sex;
        if (patient.heightCm !== undefined) basicUpdateData.heightCm = patient.heightCm;
        if (patient.weightKg !== undefined) basicUpdateData.weightKg = patient.weightKg;
        if (patient.notes !== undefined) basicUpdateData.notes = patient.notes;
        
        const [updatedPatient] = await db
          .update(patients)
          .set(basicUpdateData)
          .where(eq(patients.id, id))
          .returning();
          
        return this.normalizePatientData({
          ...updatedPatient,
          goal: null,
          activityLevel: null,
          likedHealthyFoods: [],
          dislikedFoods: [],
          hasIntolerance: null,
          intolerances: [],
          canEatMorningSolids: null,
          mealsPerDayCurrent: null,
          mealsPerDayWilling: null,
          alcoholConsumption: null,
          supplements: null,
          diseases: null,
          medications: null,
          biotype: null,
        });
      }
      throw error;
    }
  }
  
  // Invitation operations
  async createInvitation(nutritionistId: string): Promise<{ token: string }> {
    try {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias
      
      // Try with new schema first, fallback to old schema if column doesn't exist
      try {
        const invitationWithId = {
          id: nanoid(),
          nutritionistId,
          token,
          email: "placeholder@email.com", // Email temporário, será atualizado quando o paciente se registrar
          expiresAt,
        };
        
        console.log("Creating invitation with data (new schema):", invitationWithId);
        
        const [newInvitation] = await db
          .insert(invitations)
          .values(invitationWithId)
          .returning({ token: invitations.token });
          
        console.log("Invitation created successfully:", newInvitation);
        return newInvitation;
      } catch (schemaError: any) {
        if (schemaError.message?.includes('column "email" of relation "invitations" does not exist')) {
          console.log("Email column doesn't exist, using legacy schema");
          
          // Fallback to old schema without email column
          const legacyInvitation = {
            id: nanoid(),
            nutritionistId,
            token,
            expiresAt,
            status: "pending" as const,
          };
          
          console.log("Creating invitation with data (legacy schema):", legacyInvitation);
          
          const [newInvitation] = await db
            .insert(invitations)
            .values(legacyInvitation)
            .returning({ token: invitations.token });
            
          console.log("Invitation created successfully (legacy):", newInvitation);
          return newInvitation;
        }
        throw schemaError;
      }
    } catch (error) {
      console.error("Error in createInvitation storage method:", error);
      throw error;
    }
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