import "dotenv/config";
import { neonConfig, neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

const sql = isDatabaseConfigured ? neon(process.env.DATABASE_URL as string) : null;

export const db = sql ? drizzle(sql, { schema }) : null;

export { schema };
