# Security Implementation Guide

## Overview
This implementation addresses critical security vulnerabilities in the authentication system by implementing proper authorization controls for both nutritionists and patients.

## Changes Made

### 1. Database Schema Updates (`shared/schema.ts`)
- Added `authorizedNutritionists` table to control who can have nutritionist role
- Added `patientInvitations` table to manage patient invitations via secure tokens
- Added proper relations and TypeScript types for the new tables

### 2. Authentication Security (`server/auth.ts`)
- **CRITICAL FIX**: Removed automatic nutritionist role assignment for all users
- Added authorization check against `authorizedNutritionists` table
- Only pre-approved emails can become nutritionists
- Implemented patient invitation flow - patients can register via valid invitations
- Unauthorized users are properly denied access
- Added role-based middleware:
  - `requireNutritionist` - for nutritionist-only endpoints
  - `requirePatient` - for patient-only endpoints

### 3. Storage Layer (`server/storage.ts`)
- Added methods for checking authorized nutritionists
- Added methods for managing patient invitations
- Added method to find patients by email
- Added method to find valid invitations by email
- Proper database operations for the new security tables

### 4. API Routes (`server/routes.ts`)
- Updated all patient and prescription management routes to require nutritionist role
- Added invitation management routes:
  - `POST /api/invitations` - Create patient invitation (nutritionist only)
  - `GET /api/invitations/validate/:token` - Validate invitation token
  - `POST /api/invitations/accept/:token` - Accept invitation
- Added patient portal routes:
  - `GET /api/patient/profile` - Patient's own profile
  - `GET /api/patient/prescriptions` - Patient's prescriptions
  - `GET /api/patient/latest-prescription` - Patient's latest prescription
- Proper authorization middleware on all sensitive endpoints

## Deployment Steps

### 1. Database Migration
```bash
npm run db:push
```

### 2. Seed Authorized Nutritionists
1. Edit `scripts/seed-nutritionists.ts` and add authorized email addresses:
```typescript
const INITIAL_NUTRITIONISTS = [
  "nutricionista1@exemplo.com",
  "nutricionista2@exemplo.com",
];
```
2. Run the seed script:
```bash
npm run db:seed
```

### 3. Environment Variables
Ensure all required environment variables are set:
- `DATABASE_URL`
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID` 
- `AUTH0_CLIENT_SECRET`
- `BASE_URL`
- `SESSION_SECRET`

## Security Features

### For Nutritionists
- Only pre-authorized emails can access the platform as nutritionists
- Full access to patient management and prescription features
- Can generate invitation links for new patients
- Access to all nutritionist-only endpoints

### For Patients
- Can only access via valid invitation token from authorized nutritionist
- Automatic patient role assignment upon first login with valid invitation
- Invitation tokens are automatically marked as used (one-time use)
- Access to patient-only endpoints:
  - View own profile
  - View own prescriptions
  - View latest published prescription

### Token Security
- Invitation tokens are cryptographically secure (32-character nanoid)
- Tokens expire after 7 days
- Tokens can only be used once
- Proper validation on all token operations
- Automatic cleanup of used tokens

## API Endpoints

### Nutritionist Endpoints (require nutritionist role)
- `GET /api/patients` - List all patients
- `POST /api/patients` - Create new patient
- `GET /api/patients/:id` - Get patient details
- `PUT /api/patients/:id` - Update patient
- `POST /api/invitations` - Create patient invitation
- All prescription management endpoints

### Patient Endpoints (require patient role)
- `GET /api/patient/profile` - Own profile
- `GET /api/patient/prescriptions` - Own prescriptions
- `GET /api/patient/latest-prescription` - Latest prescription

### Public Endpoints
- `GET /api/invitations/validate/:token` - Validate invitation
- `POST /api/invitations/accept/:token` - Accept invitation
- Standard Auth0 authentication endpoints

## Testing
Run the included security tests:
```bash
npx tsx test/auth-security.test.ts
npx tsx test/enhanced-auth.test.ts
```

## Migration Notes
- Existing users with nutritionist role should be added to `authorized_nutritionists` table
- The system will deny access to any user not in the authorized list
- Patient invitation system provides secure onboarding for new patients
- All existing functionality remains intact for authorized users

## Security Improvements Achieved
✅ **Removed critical vulnerability**: No more automatic nutritionist role assignment  
✅ **Email-based authorization**: Only whitelisted emails can be nutritionists  
✅ **Secure patient onboarding**: Invitation-based patient registration  
✅ **Role-based access control**: Proper separation of nutritionist and patient access  
✅ **Token security**: Cryptographically secure, expiring, one-time use tokens  
✅ **Access denial**: Proper error handling for unauthorized access attempts