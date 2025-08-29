# Overview

WebDiet is a web-based nutritional prescription management system designed for nutritionists and their patients. The application allows nutritionists to create and manage patient profiles, develop detailed meal prescriptions with customizable ingredients and portions, and share these prescriptions with patients. Patients can view their latest published prescriptions in a clean, mobile-friendly interface. The system supports role-based access control with separate interfaces for nutritionists and patients.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using **React with TypeScript** and follows a modern single-page application (SPA) pattern. The application uses **Wouter** for client-side routing instead of React Router, providing a lightweight navigation solution. State management is handled through **TanStack Query (React Query)** for server state and React's built-in hooks for local component state.

The UI is constructed using **shadcn/ui components** built on top of **Radix UI primitives**, providing a consistent and accessible design system. **Tailwind CSS** handles styling with a custom configuration supporting CSS variables for theming. The application is responsive and mobile-optimized.

## Backend Architecture
The server uses **Express.js** with TypeScript in an ESM module setup. The architecture follows a layered pattern with clear separation between routes, business logic, and data access. The main components include:

- **Route handlers** in `server/routes.ts` that define API endpoints
- **Storage layer** in `server/storage.ts` that abstracts database operations
- **Authentication middleware** using Replit's OIDC integration
- **Database connection** management through Neon serverless PostgreSQL

The API follows RESTful conventions with proper HTTP status codes and error handling. Session management uses PostgreSQL-backed sessions with `connect-pg-simple`.

## Data Storage
The application uses **PostgreSQL** as the primary database with **Drizzle ORM** for type-safe database operations. The database schema includes:

- **Users table** for authentication and role management (nutritionist/patient)
- **Patients table** for patient profiles owned by nutritionists
- **Prescriptions table** for meal plans with JSON storage for complex meal data
- **Sessions table** for authentication session persistence

Database migrations are managed through Drizzle Kit, and the schema is defined in `shared/schema.ts` with Zod validation schemas for runtime type checking.

## Authentication System
Authentication is implemented using **Replit's OpenID Connect (OIDC)** integration with **Passport.js**. The system supports:

- Automatic user provisioning on first login
- Role-based access control (nutritionist vs patient)
- Session-based authentication with PostgreSQL storage
- Middleware protection for authenticated routes

Users are automatically assigned the "patient" role by default, with manual promotion to "nutritionist" as needed.

## Build and Development
The project uses **Vite** for the frontend build system with React plugin support. The backend uses **esbuild** for production bundling. Development features include:

- Hot module replacement for the frontend
- TypeScript compilation for both client and server
- Shared types between frontend and backend through the `shared` directory
- Path aliases for clean import statements

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support for real-time connections
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL operations

## Authentication
- **Replit OIDC**: OpenID Connect provider for user authentication
- **Passport.js**: Authentication middleware for Express.js

## UI Framework
- **Radix UI**: Headless UI primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: Pre-built component library built on Radix UI

## Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Type system for JavaScript
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form validation and management
- **Zod**: Runtime type validation and schema definition