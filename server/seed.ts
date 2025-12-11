/**
 * Unified Seed Database Module
 * 
 * This file provides the main entry point for database seeding.
 * All seed data is now consolidated into the unified-seed.ts file.
 * 
 * Usage: npx tsx server/unified-seed.ts
 * 
 * Demo Accounts (password: demo123):
 * - demo.student@uninexus.app    (Student)
 * - demo.teacher@uninexus.app    (Teacher)  
 * - demo.university@uninexus.app (University Admin)
 * - demo.industry@uninexus.app   (Industry Professional)
 * - demo.admin@uninexus.app      (Master Admin)
 */

// Re-export the seed function from the modular seed for backwards compatibility
export { seedDatabase } from "./seed/index";

// Default export for direct execution
import { seedDatabase } from "./seed/index";
export default seedDatabase;
