# Food Diary by Photo - Implementation Guide

## Overview
This implementation adds complete photo diary functionality to the DiNutri system, allowing patients to upload photos of their meals for each prescription.

## Technical Architecture

### 1. Database Schema
- **New table**: `food_diary_entries`
  - `id`: Primary key
  - `patientId`: Foreign key to patients table
  - `prescriptionId`: Foreign key to prescriptions table  
  - `mealId`: ID of the meal within the prescription
  - `imageUrl`: URL of the uploaded image (stored in Vercel Blob)
  - `notes`: Optional notes from patient
  - `date`: Date of the meal (YYYY-MM-DD format)
  - `createdAt`: Timestamp

### 2. Backend API
- **POST /api/food-diary/upload**: Handles file upload to Vercel Blob
- **POST /api/food-diary/entries**: Creates diary entry record in database

### 3. Frontend Components
- **FoodPhotoModal**: React modal for photo upload with preview and notes
- **Integrated into MealMenuScreen**: "Foto para o diário" button opens the modal

## Upload Flow
1. Patient clicks "Foto para o diário" button in meal menu
2. Modal opens with file picker and preview
3. Patient selects photo file (validates image types)
4. Photo is uploaded directly to Vercel Blob storage
5. Success response contains the public URL
6. Entry is saved to database with image URL and metadata

## Configuration Required

### 1. Vercel Blob Setup
1. Go to Vercel Dashboard → Storage
2. Create new Blob Store
3. Connect to your project (adds BLOB_READ_WRITE_TOKEN env var)

### 2. Database Migration
```bash
npm run db:push
```

### 3. Environment Variables
- `BLOB_READ_WRITE_TOKEN`: Auto-added by Vercel when connecting Blob Store

## File Structure
```
├── shared/schema.ts           # Added foodDiaryEntries table + relations
├── server/
│   ├── routes.ts             # Added upload & entry endpoints
│   └── storage.ts            # Added createFoodDiaryEntry method
└── client/src/components/
    ├── diary/
    │   └── food-photo-modal.tsx  # New photo upload modal
    └── meal/
        └── meal-menu-screen.tsx  # Integrated photo modal
```

## Testing
Run `node simple-test.mjs` to verify implementation completeness.

## Security Considerations
- File uploads are restricted to image types
- Upload path includes user ID for isolation  
- All endpoints require authentication
- Patient can only upload for their own meals