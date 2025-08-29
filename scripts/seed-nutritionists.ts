// Script to seed authorized nutritionists
// Run this after migrating the database to add initial authorized nutritionists

import { db } from "../server/db.js";
import { authorizedNutritionists } from "../shared/schema.js";

const INITIAL_NUTRITIONISTS = [
  // Add authorized nutritionist emails here
  // Example: "nutricionista@exemplo.com",
  // Add actual emails of nutritionists who should have access
];

async function seedNutritionists() {
  console.log("Seeding authorized nutritionists...");
  
  for (const email of INITIAL_NUTRITIONISTS) {
    try {
      await db.insert(authorizedNutritionists).values({ email }).onConflictDoNothing();
      console.log(`✓ Added nutritionist: ${email}`);
    } catch (error) {
      console.error(`✗ Failed to add nutritionist ${email}:`, error);
    }
  }
  
  console.log("Seeding completed!");
  process.exit(0);
}

seedNutritionists().catch(console.error);