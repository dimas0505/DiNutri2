import { z } from 'zod';
import { pgTable, serial, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

// Drizzle ORM Schema for assessmentDocuments
export const assessmentDocuments = pgTable('assessmentDocuments', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }).nullable(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
  user_id: integer('user_id').notNull().references(() => users.id), // Assuming a users table exists
});

// Zod Validation Schemas
export const assessmentDocumentSchema = z.object({
  id: z.number().positive().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  user_id: z.number().positive("User ID must be a positive integer"),
});
