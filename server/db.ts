import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../shared/schema.js";

const databaseUrl = process.env.DATABASE_URL?.trim();

let databaseInitializationFailed = false;

function createDatabase() {
  if (!databaseUrl) {
    return null;
  }

  try {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
  } catch (error) {
    databaseInitializationFailed = true;
    console.error("Failed to initialize the database connection.", error);
    return null;
  }
}

export const db = createDatabase();
export const isDatabaseConfigured = db !== null;
export const hasDatabaseInitializationError = databaseInitializationFailed;

export { schema };
