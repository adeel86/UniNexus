// uninexus-social-service/src/db.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
// ... (Original db.ts content remains here, using a dedicated SOCIAL_DATABASE_URL)
if (!process.env.SOCIAL_DATABASE_URL) {
  throw new Error("SOCIAL_DATABASE_URL environment variable is required");
}
export const db = drizzle({ 
  connection: process.env.SOCIAL_DATABASE_URL, 
  ws: ws,
});
