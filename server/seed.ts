// Seed database module - refactored into modular components
// See server/seed/data/ for individual seed files
// See server/SEED_README.md for documentation

export { seedDatabase } from "./seed/index";

// Re-export for backwards compatibility
import { seedDatabase } from "./seed/index";
export default seedDatabase;
