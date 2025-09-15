import { pgTable, varchar, text, timestamp, boolean, integer, jsonb, index, real, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (RE-ADICIONADA - ESSENCIAL PARA LOGIN)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums for subscription plans
export const planTypeEnum = pgEnum('plan_type', ['free', 'monthly', 'quarterly']);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'pending_payment',
  'pending_approval',
  'expired',
  'canceled'
]);

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
  // New anamnese fields
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
  expiresAt: timestamp("expires_at"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mood entries table
export const moodEntries = pgTable("mood_entries", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  prescriptionId: varchar("prescription_id").references(() => prescriptions.id, { onDelete: 'cascade' }).notNull(),
  mealId: varchar("meal_id").notNull(), // ID da refeição dentro da prescrição
  moodBefore: varchar("mood_before", { enum: ["very_sad", "sad", "neutral", "happy", "very_happy"] }),
  moodAfter: varchar("mood_after", { enum: ["very_sad", "sad", "neutral", "happy", "very_happy"] }),
  notes: text("notes"),
  date: varchar("date").notNull(), // Format: YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Anamnesis Records table
export const anamnesisRecords = pgTable("anamnesis_records", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  
  // Anamnesis fields - a snapshot in time
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
  
  // Feedback fields for follow-up anamnesis
  protocolAdherence: varchar("protocol_adherence", { enum: ["total", "partial", "low"] }),
  nextProtocolRequests: text("next_protocol_requests"),
  
  // Nutritionist-only fields for calculations
  tmb: real("tmb"),
  get: real("get"),
  vet: real("vet"),
  usedFormula: text("used_formula"),
  
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
  date: varchar("date").notNull(), // Format: YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  planType: planTypeEnum("plan_type").notNull(),
  status: subscriptionStatusEnum("status").notNull(),
  startDate: timestamp("start_date").notNull(),
  expiresAt: timestamp("expires_at"), // Nullable for free plans
  paymentLink: text("payment_link"),
  proofOfPaymentUrl: text("proof_of_payment_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity Log table for tracking user activities
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  activityType: varchar("activity_type", { length: 255 }).notNull(), // ex: 'login', 'view_prescription'
  details: text("details"), // ex: 'Prescription ID: xyz'
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  subscriptions: many(subscriptions),
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

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  patient: one(patients, {
    fields: [subscriptions.patientId],
    references: [patients.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
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

// Mood types - ajustado para aceitar null (que é o que o Drizzle retorna)
export type MoodType = "very_sad" | "sad" | "neutral" | "happy" | "very_happy";

// Type para MoodEntry que aceita null do banco de dados
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

// Date preprocessor for flexible date handling
const datePreprocess = z.preprocess((arg) => {
  if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
}, z.date());

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
}).extend({
  expiresAt: datePreprocess.nullable(),
});

export const updatePrescriptionSchema = createInsertSchema(prescriptions).omit({
  id: true,
  patientId: true,
  nutritionistId: true,
  createdAt: true,
  updatedAt: true,
}).partial().extend({
  expiresAt: datePreprocess.nullable().optional(),
});

export const insertMoodEntrySchema = createInsertSchema(moodEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnamnesisRecordSchema = createInsertSchema(anamnesisRecords).omit({
  id: true,
  createdAt: true,
}).extend({
  // Nutritionist fields validation
  tmb: z.coerce.number().min(0, "TMB deve ser um valor positivo").optional().nullable(),
  get: z.coerce.number().min(0, "GET deve ser um valor positivo").optional().nullable(),
  vet: z.coerce.number().min(0, "VET deve ser um valor positivo").optional().nullable(),
  usedFormula: z.string().optional().nullable(),
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

export const updatePatientSchema = insertPatientSchema.partial();

// Enhanced anamnesis schema with mandatory fields for patient registration
export const anamnesisSchema = insertPatientSchema.omit({ ownerId: true, userId: true }).extend({
  // Password fields for account creation
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  confirmPassword: z.string(),
  
  // Patient data fields - now mandatory
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  sex: z.enum(["M", "F", "Outro"], { 
    errorMap: () => ({ message: "Selecione o sexo" })
  }).default("M"), // Provide a default value
  heightCm: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : val),
    z.coerce.number().min(50, "Altura deve ser no mínimo 50cm").max(250, "Altura deve ser no máximo 250cm")
      .refine(val => val !== undefined, "Altura é obrigatória")
  ),
  weightKg: z.string()
    .min(1, "Peso é obrigatório")
    .regex(/^\d+(\.\d{1,2})?$/, "Peso inválido. Use formato: 65.50"),

  // Goals and habits fields - some mandatory, some optional
  goal: z.enum(["lose_weight", "maintain_weight", "gain_weight"], {
    errorMap: () => ({ message: "Selecione um objetivo" })
  }),
  activityLevel: z.enum(["1", "2", "3", "4", "5"], {
    errorMap: () => ({ message: "Selecione o nível de atividade física" })
  }),
  biotype: z.enum(["gain_weight_easily", "hard_to_gain", "gain_muscle_easily"], {
    errorMap: () => ({ message: "Selecione o biotipo" })
  }),
  mealsPerDayCurrent: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : val),
    z.coerce.number().min(1, "Deve ser no mínimo 1 refeição").max(10, "Deve ser no máximo 10 refeições")
      .refine(val => val !== undefined, "Número de refeições atuais é obrigatório")
  ),
  mealsPerDayWilling: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : val),
    z.coerce.number().min(1, "Deve ser no mínimo 1 refeição").max(10, "Deve ser no máximo 10 refeições")
      .refine(val => val !== undefined, "Número de refeições dispostas é obrigatório")
  ),
  alcoholConsumption: z.enum(["yes", "no", "moderate"], {
    errorMap: () => ({ message: "Selecione o consumo de álcool" })
  }),
  
  // Boolean fields - ensure they are explicitly set
  canEatMorningSolids: z.boolean({
    errorMap: () => ({ message: "Marque se consegue comer sólidos pela manhã" })
  }),
  hasIntolerance: z.boolean().optional(), // Optional boolean field

  // Preferences fields - optional arrays
  likedHealthyFoods: z.array(z.string()).optional(),
  dislikedFoods: z.array(z.string()).optional(),
  
  // Conditional intolerance field
  intolerances: z.array(z.string()).default([]),
  
  // Health information fields - now optional
  diseases: z.string().optional(),
  medications: z.string().optional(),
  supplements: z.string().optional(),
  
  // Notes field - keep optional
  notes: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não correspondem.",
  path: ["confirmPassword"],
}).refine(data => {
  // If hasIntolerance is true, intolerances array must not be empty
  if (data.hasIntolerance && data.intolerances.length === 0) {
    return false;
  }
  return true;
}, {
  message: "Informe suas intolerâncias alimentares",
  path: ["intolerances"]
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type UpdatePatient = z.infer<typeof updatePatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type AnamnesisFormData = z.infer<typeof anamnesisSchema>;
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
export type ActivityLog = typeof activityLog.$inferSelect;

// Extended type for food diary entries with prescription and mood information
export interface FoodDiaryEntryWithPrescription extends FoodDiaryEntry {
  prescriptionTitle?: string | null;
  prescriptionMeals?: MealData[] | null;
  moodBefore?: MoodType | null;
  moodAfter?: MoodType | null;
  moodNotes?: string | null;
}