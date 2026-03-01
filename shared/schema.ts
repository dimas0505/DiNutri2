import { pgTable, varchar, text, timestamp, boolean, integer, jsonb, index, serial, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["admin", "nutritionist", "patient"] }).notNull().default("patient"),
  hashedPassword: varchar("hashed_password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patients table
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey(),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(),
  email: varchar("email"),
  birthDate: varchar("birth_date"),
  sex: varchar("sex", { enum: ["M", "F", "Outro"] }),
  heightCm: integer("height_cm"),
  weightKg: varchar("weight_kg"),
  notes: text("notes"),
  goal: varchar("goal", { enum: ["lose_weight", "maintain_weight", "gain_weight"] }),
  activityLevel: varchar("activity_level", { enum: ["1", "2", "3", "4", "5"] }),
  likedHealthyFoods: jsonb("liked_healthy_foods").$type<string[]>().default([]),
  dislikedFoods: jsonb("disliked_foods").$type<string[]>().default([]),
  hasIntolerance: boolean("has_intolerance"),
  intolerances: jsonb("intolerances").$type<string[]>().default([]),
  canEatMorningSolids: boolean("can_eat_morning_solids"),
  mealsPerDayCurrent: integer("meals_per_day_current"),
  mealsPerDayWilling: integer("meals_per_day_willing"),
  alcoholConsumption: varchar("alcohol_consumption", { enum: ["yes", "no", "moderate"] }),
  supplements: text("supplements"),
  diseases: text("diseases"),
  medications: text("medications"),
  biotype: varchar("biotype", { enum: ["gain_weight_easily", "hard_to_gain", "gain_muscle_easily"] }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invitations table
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey(),
  email: varchar("email").notNull(),
  nutritionistId: varchar("nutritionist_id").references(() => users.id).notNull(),
  role: varchar("role", { enum: ["patient"] }).notNull().default("patient"),
  token: varchar("token").unique().notNull(),
  status: varchar("status", { enum: ["pending", "accepted", "expired"] }).notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Prescriptions table
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  nutritionistId: varchar("nutritionist_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  status: varchar("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  meals: jsonb("meals").$type<MealData[]>().notNull().default([]),
  generalNotes: text("general_notes"),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mood entries table
export const moodEntries = pgTable("mood_entries", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  prescriptionId: varchar("prescription_id").references(() => prescriptions.id, { onDelete: 'cascade' }).notNull(),
  mealId: varchar("meal_id").notNull(),
  moodBefore: varchar("mood_before", { enum: ["very_sad", "sad", "neutral", "happy", "very_happy"] }),
  moodAfter: varchar("mood_after", { enum: ["very_sad", "sad", "neutral", "happy", "very_happy"] }),
  notes: text("notes"),
  date: varchar("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Anamnesis Records table
export const anamnesisRecords = pgTable("anamnesis_records", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  weightKg: varchar("weight_kg"),
  notes: text("notes"),
  goal: varchar("goal", { enum: ["lose_weight", "maintain_weight", "gain_weight"] }),
  activityLevel: varchar("activity_level", { enum: ["1", "2", "3", "4", "5"] }),
  likedHealthyFoods: jsonb("liked_healthy_foods").$type<string[]>().default([]),
  dislikedFoods: jsonb("disliked_foods").$type<string[]>().default([]),
  hasIntolerance: boolean("has_intolerance"),
  intolerances: jsonb("intolerances").$type<string[]>().default([]),
  canEatMorningSolids: boolean("can_eat_morning_solids"),
  mealsPerDayCurrent: integer("meals_per_day_current"),
  mealsPerDayWilling: integer("meals_per_day_willing"),
  alcoholConsumption: varchar("alcohol_consumption", { enum: ["yes", "no", "moderate"] }),
  supplements: text("supplements"),
  diseases: text("diseases"),
  medications: text("medications"),
  biotype: varchar("biotype", { enum: ["gain_weight_easily", "hard_to_gain", "gain_muscle_easily"] }),
  protocolAdherence: varchar("protocol_adherence", { enum: ["total", "partial", "low"] }),
  nextProtocolRequests: text("next_protocol_requests"),
  tmb: real("tmb"),
  get: real("get"),
  vet: real("vet"),
  usedFormula: text("used_formula"),
  targetCarbPercent: real("target_carb_percent"),
  targetProteinPercent: real("target_protein_percent"),
  targetFatPercent: real("target_fat_percent"),
  targetCarbG: real("target_carb_g"),
  targetProteinG: real("target_protein_g"),
  targetFatG: real("target_fat_g"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Food Diary Entries table
export const foodDiaryEntries = pgTable("food_diary_entries", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  prescriptionId: varchar("prescription_id").references(() => prescriptions.id, { onDelete: 'cascade' }).notNull(),
  mealId: varchar("meal_id").notNull(),
  imageUrl: text("image_url"),
  notes: text("notes"),
  date: varchar("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  planType: varchar("plan_type", { enum: ["free", "monthly", "quarterly"] }).notNull(),
  status: varchar("status", { enum: ["active", "pending_payment", "pending_approval", "expired", "canceled"] }).notNull(),
  startDate: timestamp("start_date").notNull(),
  expiresAt: timestamp("expires_at"),
  paymentLink: text("payment_link"),
  proofOfPaymentUrl: text("proof_of_payment_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity Log table
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  activityType: varchar("activity_type", { length: 255 }).notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Anthropometric Assessments table
export const anthropometricAssessments = pgTable("anthropometric_assessments", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  nutritionistId: varchar("nutritionist_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  // Circumferences (cm)
  circumNeck: real("circum_neck"),
  circumChest: real("circum_chest"),
  circumWaist: real("circum_waist"),
  circumAbdomen: real("circum_abdomen"),
  circumHip: real("circum_hip"),
  circumNonDominantArmRelaxed: real("circum_non_dominant_arm_relaxed"),
  circumNonDominantArmContracted: real("circum_non_dominant_arm_contracted"),
  circumNonDominantProximalThigh: real("circum_non_dominant_proximal_thigh"),
  circumNonDominantCalf: real("circum_non_dominant_calf"),
  // Skinfolds - Durnin equation (mm)
  foldBiceps: real("fold_biceps"),
  foldTriceps: real("fold_triceps"),
  foldSubscapular: real("fold_subscapular"),
  foldSuprailiac: real("fold_suprailiac"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patient Documents table (for assessment file uploads)
export const patientDocuments = pgTable("patient_documents", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  nutritionistId: varchar("nutritionist_id").references(() => users.id).notNull(),
  fileName: varchar("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  patientProfile: one(patients, {
    fields: [users.id],
    references: [patients.userId],
  }),
  ownedPatients: many(patients, { relationName: 'ownedPatients' }),
  prescriptions: many(prescriptions),
  invitations: many(invitations),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  owner: one(users, {
    fields: [patients.ownerId],
    references: [users.id],
    relationName: 'ownedPatients'
  }),
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  prescriptions: many(prescriptions),
  moodEntries: many(moodEntries),
  anamnesisRecords: many(anamnesisRecords),
  foodDiaryEntries: many(foodDiaryEntries),
  documents: many(patientDocuments),
  anthropometricAssessments: many(anthropometricAssessments),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  nutritionist: one(users, {
    fields: [invitations.nutritionistId],
    references: [users.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  nutritionist: one(users, {
    fields: [prescriptions.nutritionistId],
    references: [users.id],
  }),
  moodEntries: many(moodEntries),
  foodDiaryEntries: many(foodDiaryEntries),
}));

export const moodEntriesRelations = relations(moodEntries, ({ one }) => ({
  patient: one(patients, {
    fields: [moodEntries.patientId],
    references: [patients.id],
  }),
  prescription: one(prescriptions, {
    fields: [moodEntries.prescriptionId],
    references: [prescriptions.id],
  }),
}));

export const anamnesisRecordsRelations = relations(anamnesisRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [anamnesisRecords.patientId],
    references: [patients.id],
  }),
}));

export const foodDiaryEntriesRelations = relations(foodDiaryEntries, ({ one }) => ({
  patient: one(patients, {
    fields: [foodDiaryEntries.patientId],
    references: [patients.id],
  }),
  prescription: one(prescriptions, {
    fields: [foodDiaryEntries.prescriptionId],
    references: [prescriptions.id],
  }),
}));

export const patientDocumentsRelations = relations(patientDocuments, ({ one }) => ({
  patient: one(patients, {
    fields: [patientDocuments.patientId],
    references: [patients.id],
  }),
  nutritionist: one(users, {
    fields: [patientDocuments.nutritionistId],
    references: [users.id],
  }),
}));

export const anthropometricAssessmentsRelations = relations(anthropometricAssessments, ({ one }) => ({
  patient: one(patients, {
    fields: [anthropometricAssessments.patientId],
    references: [patients.id],
  }),
  nutritionist: one(users, {
    fields: [anthropometricAssessments.nutritionistId],
    references: [users.id],
  }),
}));

// Types for prescription meals structure
export interface MealItemData {
  id: string;
  description: string;
  amount: string;
  substitutes?: string[];
}

export interface MealData {
  id: string;
  name: string;
  items: MealItemData[];
  notes?: string;
}

// Mood types
export type MoodType = "very_sad" | "sad" | "neutral" | "happy" | "very_happy";

export type MoodEntry = {
  id: string;
  patientId: string;
  prescriptionId: string;
  mealId: string;
  moodBefore: MoodType | null;
  moodAfter: MoodType | null;
  notes: string | null;
  date: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
  hashedPassword: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  patientId: true,
  nutritionistId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertMoodEntrySchema = createInsertSchema(moodEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnamnesisRecordSchema = createInsertSchema(anamnesisRecords).omit({
  id: true,
  createdAt: true,
});

export const insertFoodDiaryEntrySchema = createInsertSchema(foodDiaryEntries).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPatientDocumentSchema = createInsertSchema(patientDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertAnthropometricAssessmentSchema = createInsertSchema(anthropometricAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateAnthropometricAssessmentSchema = insertAnthropometricAssessmentSchema.omit({
  patientId: true,
  nutritionistId: true,
}).partial();

export const updatePatientSchema = insertPatientSchema.partial();

// Anamnesis registration schema (patient self-registration form)
export const anamnesisSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string().min(8, "Confirmação de senha deve ter pelo menos 8 caracteres"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  sex: z.enum(["M", "F", "Outro"]),
  heightCm: z.number().positive().optional().nullable(),
  weightKg: z.string().optional(),
  notes: z.string().optional(),
  goal: z.enum(["lose_weight", "maintain_weight", "gain_weight"]).optional(),
  activityLevel: z.enum(["1", "2", "3", "4", "5"]).optional(),
  likedHealthyFoods: z.array(z.string()).default([]),
  dislikedFoods: z.array(z.string()).default([]),
  hasIntolerance: z.boolean().default(false),
  intolerances: z.array(z.string()).default([]),
  canEatMorningSolids: z.boolean().default(false),
  mealsPerDayCurrent: z.number().positive().int().optional().nullable(),
  mealsPerDayWilling: z.number().positive().int().optional().nullable(),
  alcoholConsumption: z.enum(["yes", "no", "moderate"]).optional(),
  supplements: z.string().optional(),
  diseases: z.string().optional(),
  medications: z.string().optional(),
  biotype: z.enum(["gain_weight_easily", "hard_to_gain", "gain_muscle_easily"]).optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type UpdatePatient = z.infer<typeof updatePatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type UpdatePrescription = z.infer<typeof updatePrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
export type AnamnesisRecord = typeof anamnesisRecords.$inferSelect;
export type FoodDiaryEntry = typeof foodDiaryEntries.$inferSelect;
export type InsertFoodDiaryEntry = z.infer<typeof insertFoodDiaryEntrySchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type PatientDocument = typeof patientDocuments.$inferSelect;
export type InsertPatientDocument = z.infer<typeof insertPatientDocumentSchema>;
export type AnthropometricAssessment = typeof anthropometricAssessments.$inferSelect;
export type InsertAnthropometricAssessment = z.infer<typeof insertAnthropometricAssessmentSchema>;
export type UpdateAnthropometricAssessment = z.infer<typeof updateAnthropometricAssessmentSchema>;

// Extended type for food diary entries with prescription and mood information
export interface FoodDiaryEntryWithPrescription extends FoodDiaryEntry {
  prescriptionTitle?: string | null;
  prescriptionMeals?: MealData[] | null;
  moodBefore?: MoodType | null;
  moodAfter?: MoodType | null;
  moodNotes?: string | null;
  moodId?: string | null;
}
