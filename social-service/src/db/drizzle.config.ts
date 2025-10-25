// uninexus-social-service/drizzle.config.ts

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  driver: 'pg', // Assuming PostgreSQL
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!, // Reads from .env.local
  },
  verbose: true,
  strict: true,
});
