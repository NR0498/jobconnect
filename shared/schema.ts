import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  title: varchar("title", { length: 255 }).notNull(),
  track: varchar("track", { length: 32 }).notNull(),
  employmentType: varchar("employment_type", { length: 32 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  compensation: varchar("compensation", { length: 120 }),
  remote: boolean("remote").default(false).notNull(),
  visaSponsorship: boolean("visa_sponsorship").default(false).notNull(),
  startupScore: integer("startup_score").default(0).notNull(),
  source: varchar("source", { length: 64 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobs);

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
  visaSponsorship: z.boolean().default(false),
  startup: z.boolean().default(false),
  startupScore: z.number().default(0),
  source: z.enum(["remotive", "arbeitnow", "seed"]),
  sourceUrl: z.string().url(),
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

export type Opportunity = z.infer<typeof opportunitySchema>;
export type OpportunitiesResponse = z.infer<typeof opportunitiesResponseSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type Track = z.infer<typeof trackSchema>;
