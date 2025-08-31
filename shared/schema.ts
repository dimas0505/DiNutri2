import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  decimal,
  uuid as pgUuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  hashedPassword: text("hashed_password"), // <-- CAMPO ADICIONADO
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["nutritionist", "patient"] }).notNull().default("patient"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patients table
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => users.id).notNull(), // nutritionist
  userId: varchar("user_id").references(() => users.id).unique(), // Link to the patient's own user account
  name: text("name").notNull(),
  email: varchar("email").notNull(),
  birthDate: varchar("birth_date"), // YYYY-MM-DD format
  sex: varchar("sex", { enum: ["M", "F", "Outro"] }),
  heightCm: integer("height_cm"),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  notes: text("notes"),
  // invitationToken was removed from here
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NEW: Invitations table
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nutritionistId: varchar("nutritionist_id").references(() => users.id).notNull(),
  token: text("token").unique().notNull(),
  status: varchar("status", { enum: ["pending", "accepted"] }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Prescriptions table
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  patientProfile: one(patients, { // A user might have a patient profile
    fields: [users.id],
    references: [patients.userId],
  }),
  ownedPatients: many(patients, { relationName: 'ownedPatients' }), // Nutritionist's patients
  prescriptions: many(prescriptions),
  invitations: many(invitations), // Nutritionist's invitations
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  owner: one(users, {
    fields: [patients.ownerId],
    references: [users.id],
    relationName: 'ownedPatients'
  }),
  user: one(users, { // The patient's user account
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
  hashedPassword: true, // <-- CAMPO ADICIONADO
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