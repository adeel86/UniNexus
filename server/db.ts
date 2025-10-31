import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
// `pg` may not expose named exports under certain ESM resolution setups.
// Import the package as a default and extract `Pool` to be robust across environments.
import pkg from "pg";
const { Pool } = pkg as any;
import ws from "ws";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const isDev = process.env.NODE_ENV === 'development';

let db: any;
if (isDev) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzlePg(pool);
} else {
  db = drizzleNeon({ connection: process.env.DATABASE_URL, ws });
}

export { db };
