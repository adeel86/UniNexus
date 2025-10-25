// uninexus-identity-service/src/db.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
// ... (Original db.ts content remains here, using a dedicated IDENTITY_DATABASE_URL)
if (!process.env.IDENTITY_DATABASE_URL) {
  throw new Error("IDENTITY_DATABASE_URL environment variable is required");
}
export const db = drizzle({ 
  connection: process.env.IDENTITY_DATABASE_URL, 
  ws: ws,
});
