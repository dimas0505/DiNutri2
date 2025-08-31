import { pgTable, varchar, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  patientId: varchar("patient_id").references(() => patients.id).notNull(),
  nutritionistId: varchar("nutritionist_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  status: varchar("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  meals: jsonb("meals").$type<MealData[]>().notNull().default([]),
  generalNotes: text("general_notes"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  nutritionist: one(users, {
    fields: [invitations.nutritionistId],
    references: [users.id],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one }) => ({
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  nutritionist: one(users, {
    fields: [prescriptions.nutritionistId],
    references: [users.id],
  }),
}));

// Types for prescription meals structure
export interface MealItemData {
  id: string;
  description: string;
  amount: string;
  substitutes?: string[]; // Nova propriedade para substitutos
}

export interface MealData {
  id: string;
  name: string;
  items: MealItemData[];
  notes?: string;
}

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

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type UpdatePrescription = z.infer<typeof updatePrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;