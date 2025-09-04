# Food Diary Implementation - Visual Summary

## Files Modified/Created

### Database Schema (`shared/schema.ts`)
```typescript
// NEW TABLE ADDED
export const foodDiaryEntries = pgTable("food_diary_entries", {
  id: varchar("id").primaryKey(),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }).notNull(),
  prescriptionId: varchar("prescription_id").references(() => prescriptions.id, { onDelete: 'cascade' }).notNull(),
  mealId: varchar("meal_id").notNull(),
  imageUrl: text("image_url").notNull(),
  notes: text("notes"),
  date: varchar("date").notNull(), // Format: YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW RELATIONS ADDED
export const foodDiaryEntriesRelations = relations(foodDiaryEntries, ({ one }) => ({
  patient: one(patients, ...),
  prescription: one(prescriptions, ...),
}));
```

### Backend Storage (`server/storage.ts`)
```typescript
// NEW METHOD ADDED TO INTERFACE
interface IStorage {
  // ... existing methods ...
  createFoodDiaryEntry(entry: InsertFoodDiaryEntry): Promise<FoodDiaryEntry>;
}

// NEW METHOD IMPLEMENTATION
async createFoodDiaryEntry(entry: InsertFoodDiaryEntry): Promise<FoodDiaryEntry> {
  const entryWithId = { id: nanoid(), ...entry };
  const [newEntry] = await db.insert(foodDiaryEntries).values(entryWithId).returning();
  return newEntry;
}
```

### Backend Routes (`server/routes.ts`)
```typescript
// NEW IMPORTS
import { put } from '@vercel/blob';
import { insertFoodDiaryEntrySchema } from "../shared/schema.js";

// NEW ROUTES ADDED
app.post('/api/food-diary/upload', isAuthenticated, async (req: any, res) => {
  // Uploads file directly to Vercel Blob
  // Returns blob URL for use in database entry
});

app.post('/api/food-diary/entries', isAuthenticated, async (req: any, res) => {
  // Saves photo metadata to database
  // Links to patient and prescription
});
```

### Frontend Modal Component (`client/src/components/diary/food-photo-modal.tsx`)
```typescript
// NEW COMPONENT CREATED
export default function FoodPhotoModal({ isOpen, onClose, meal, prescriptionId }) {
  // File selection with preview
  // Notes input field
  // Upload mutation handling
  // Success/error feedback via toast
}
```

### Frontend Integration (`client/src/components/meal/meal-menu-screen.tsx`)
```typescript
// IMPORTS ADDED
import FoodPhotoModal from "@/components/diary/food-photo-modal";

// STATE ADDED
const [showPhotoModal, setShowPhotoModal] = useState(false);

// HANDLER UPDATED
const handlePhotoAction = () => {
  setShowPhotoModal(true); // Was: toast placeholder
};

// MODAL RENDERED
<FoodPhotoModal
  isOpen={showPhotoModal}
  onClose={() => setShowPhotoModal(false)}
  meal={meal}
  prescriptionId={prescriptionId}
/>
```

## User Experience Flow

1. **Patient View**: 
   - Opens meal from prescription
   - Sees "Foto para o diário alimentar" button (same UI, now functional)

2. **Modal Opens**:
   - File upload area with drag/drop styling
   - Image preview after selection
   - Optional notes textarea
   - "Enviar Foto" button

3. **Upload Process**:
   - File uploads to Vercel Blob
   - Metadata saves to PostgreSQL
   - Success toast notification
   - Modal closes, resets state

4. **Data Storage**:
   - Image URL stored in `foodDiaryEntries.imageUrl`
   - Linked to specific patient, prescription, and meal
   - Timestamped for tracking

## Database Migration
- Migration file: `migrations/0002_sweet_hercules.sql`
- Creates `food_diary_entries` table
- Adds foreign key constraints
- Includes CASCADE DELETE for data integrity

The implementation is complete and ready for deployment once Vercel Blob is configured!