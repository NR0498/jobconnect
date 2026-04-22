import {
  boolean,
  integer,
  jsonb,
  pgTable,
  uniqueIndex,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  city: varchar("city", { length: 120 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

export const authSessions = pgTable("auth_sessions", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenHashIdx: uniqueIndex("auth_sessions_token_hash_idx").on(table.tokenHash),
}));

export const companies = pgTable("companies", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: text("website_url"),
  logoUrl: text("logo_url"),
  description: text("description"),
  isStartup: boolean("is_startup").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id", { length: 128 }).primaryKey(),
  companyId: varchar("company_id", { length: 128 }),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  track: varchar("track", { length: 32 }).notNull(),
  employmentType: varchar("employment_type", { length: 32 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  country: varchar("country", { length: 64 }).default("India").notNull(),
  state: varchar("state", { length: 120 }),
  city: varchar("city", { length: 120 }),
  summary: text("summary").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  compensation: varchar("compensation", { length: 120 }),
  remote: boolean("remote").default(false).notNull(),
  visaSponsorship: boolean("visa_sponsorship").default(false).notNull(),
  startupScore: integer("startup_score").default(0).notNull(),
  startup: boolean("startup").default(false).notNull(),
  source: varchar("source", { length: 64 }).notNull(),
  sourceLabel: varchar("source_label", { length: 120 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  officialApplyUrl: text("official_apply_url").notNull(),
  applyDomain: varchar("apply_domain", { length: 255 }),
  researchDomain: varchar("research_domain", { length: 120 }),
  isActive: boolean("is_active").default(true).notNull(),
  postedAt: timestamp("posted_at"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const syncRuns = pgTable("sync_runs", {
  id: varchar("id", { length: 128 }).primaryKey(),
  source: varchar("source", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  fetchedCount: integer("fetched_count").default(0).notNull(),
  insertedCount: integer("inserted_count").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobs);
export const registerUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  city: z.string().min(2).max(80).optional(),
});
export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(120),
});

export const trackSchema = z.enum(["all", "internship", "full-time", "research"]);
export const sortSchema = z.enum(["latest", "startup", "salary"]);

export const opportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  companyWebsite: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  location: z.string(),
  summary: z.string(),
  employmentType: z.string(),
  track: z.enum(["internship", "full-time", "research"]),
  tags: z.array(z.string()).default([]),
  compensation: z.string().optional(),
  remote: z.boolean().default(false),
  country: z.literal("India"),
  state: z.string().optional(),
  city: z.string().optional(),
  visaSponsorship: z.boolean().default(false),
  startup: z.boolean().default(false),
  startupScore: z.number().default(0),
  source: z.enum(["adzuna", "remotive", "themuse", "jobicy"]),
  sourceLabel: z.string(),
  sourceUrl: z.string().url(),
  officialApplyUrl: z.string().url(),
  applyDomain: z.string().optional(),
  postedAt: z.string().optional(),
  researchDomain: z.string().optional(),
});

export const dashboardStatsSchema = z.object({
  total: z.number(),
  internships: z.number(),
  fullTime: z.number(),
  research: z.number(),
  startups: z.number(),
  remoteFriendly: z.number(),
  visaSponsorship: z.number(),
  topTags: z.array(
    z.object({
      tag: z.string(),
      count: z.number(),
    }),
  ),
  startupCompanies: z.array(
    z.object({
      company: z.string(),
      openings: z.number(),
      averageStartupScore: z.number(),
    }),
  ),
});

export const opportunitiesResponseSchema = z.object({
  fetchedAt: z.string(),
  query: z.object({
    search: z.string().optional(),
    location: z.string().optional(),
    track: trackSchema.optional(),
    startupsOnly: z.boolean().optional(),
  }),
  ai: z.object({
    enabled: z.boolean(),
    model: z.string().optional(),
    notes: z.string().optional(),
    expansions: z.array(z.string()).optional(),
  }),
  stats: dashboardStatsSchema,
  opportunities: z.array(opportunitySchema),
});

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  city: z.string().optional(),
});

export type Opportunity = z.infer<typeof opportunitySchema>;
export type OpportunitiesResponse = z.infer<typeof opportunitiesResponseSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type Track = z.infer<typeof trackSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
