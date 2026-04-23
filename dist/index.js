var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import http from "node:http";
import path2 from "node:path";
import { fileURLToPath } from "node:url";

// server/app.ts
import express from "express";

// server/auth.ts
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { nanoid } from "nanoid";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  authSessions: () => authSessions,
  authUserSchema: () => authUserSchema,
  companies: () => companies,
  dashboardStatsSchema: () => dashboardStatsSchema,
  insertJobSchema: () => insertJobSchema,
  jobs: () => jobs,
  loginUserSchema: () => loginUserSchema,
  opportunitiesResponseSchema: () => opportunitiesResponseSchema,
  opportunitySchema: () => opportunitySchema,
  registerUserSchema: () => registerUserSchema,
  sortSchema: () => sortSchema,
  syncRuns: () => syncRuns,
  trackSchema: () => trackSchema,
  users: () => users
});
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  uniqueIndex,
  text,
  timestamp,
  varchar
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  city: varchar("city", { length: 120 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email)
}));
var authSessions = pgTable("auth_sessions", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: varchar("user_id", { length: 128 }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  tokenHashIdx: uniqueIndex("auth_sessions_token_hash_idx").on(table.tokenHash)
}));
var companies = pgTable("companies", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: text("website_url"),
  logoUrl: text("logo_url"),
  description: text("description"),
  isStartup: boolean("is_startup").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var jobs = pgTable("jobs", {
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
  tags: jsonb("tags").$type().default([]).notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var syncRuns = pgTable("sync_runs", {
  id: varchar("id", { length: 128 }).primaryKey(),
  source: varchar("source", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  fetchedCount: integer("fetched_count").default(0).notNull(),
  insertedCount: integer("inserted_count").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertJobSchema = createInsertSchema(jobs);
var registerUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  city: z.string().min(2).max(80).optional()
});
var loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(120)
});
var trackSchema = z.enum(["all", "internship", "full-time", "research"]);
var sortSchema = z.enum(["latest", "startup", "salary"]);
var opportunitySchema = z.object({
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
  researchDomain: z.string().optional()
});
var dashboardStatsSchema = z.object({
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
      count: z.number()
    })
  ),
  startupCompanies: z.array(
    z.object({
      company: z.string(),
      openings: z.number(),
      averageStartupScore: z.number()
    })
  )
});
var opportunitiesResponseSchema = z.object({
  fetchedAt: z.string(),
  query: z.object({
    search: z.string().optional(),
    location: z.string().optional(),
    track: trackSchema.optional(),
    startupsOnly: z.boolean().optional()
  }),
  ai: z.object({
    enabled: z.boolean(),
    model: z.string().optional(),
    notes: z.string().optional(),
    expansions: z.array(z.string()).optional()
  }),
  stats: dashboardStatsSchema,
  opportunities: z.array(opportunitySchema)
});
var authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  city: z.string().optional()
});

// server/db.ts
import "dotenv/config";
import { neonConfig, neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
var isDatabaseConfigured = Boolean(process.env.DATABASE_URL);
var sql = isDatabaseConfigured ? neon(process.env.DATABASE_URL) : null;
var db = sql ? drizzle(sql, { schema: schema_exports }) : null;

// server/memoryStore.ts
var memoryStore = {
  users: /* @__PURE__ */ new Map(),
  sessions: /* @__PURE__ */ new Map(),
  opportunities: [],
  lastSyncAt: null
};

// server/auth.ts
var SESSION_COOKIE_NAME = "jobconnect_session";
var SESSION_TTL_MS = 1e3 * 60 * 60 * 24 * 14;
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
function getCookieValue(request, cookieName) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${cookieName}=`)) {
      return decodeURIComponent(cookie.slice(cookieName.length + 1));
    }
  }
  return null;
}
function clearSessionCookie(response) {
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Lax";
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}
function setSessionCookie(response, token) {
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Lax";
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1e3}; SameSite=${sameSite}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
}
async function createSession(response, userId) {
  const token = nanoid(48);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  if (db && isDatabaseConfigured) {
    await db.insert(authSessions).values({
      id: nanoid(),
      userId,
      tokenHash,
      expiresAt
    });
  } else {
    memoryStore.sessions.set(tokenHash, {
      userId,
      expiresAt
    });
  }
  setSessionCookie(response, token);
}
async function registerUser(input, response) {
  const parsed = registerUserSchema.parse(input);
  const email = parsed.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.password, 10);
  if (db && isDatabaseConfigured) {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      throw new Error("An account with that email already exists.");
    }
    const user2 = {
      id: nanoid(),
      email,
      name: parsed.name.trim(),
      city: parsed.city?.trim(),
      passwordHash,
      avatarUrl: null
    };
    await db.insert(users).values(user2);
    await createSession(response, user2.id);
    return authUserSchema.parse(user2);
  }
  for (const user2 of Array.from(memoryStore.users.values())) {
    if (user2.email === email) {
      throw new Error("An account with that email already exists.");
    }
  }
  const user = {
    id: nanoid(),
    email,
    name: parsed.name.trim(),
    city: parsed.city?.trim(),
    passwordHash
  };
  memoryStore.users.set(user.id, user);
  await createSession(response, user.id);
  return authUserSchema.parse(user);
}
async function loginUser(input, response) {
  const parsed = loginUserSchema.parse(input);
  const email = parsed.email.trim().toLowerCase();
  if (db && isDatabaseConfigured) {
    const matches = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user2 = matches[0];
    if (!user2) {
      throw new Error("Invalid email or password.");
    }
    const isValid2 = await bcrypt.compare(parsed.password, user2.passwordHash);
    if (!isValid2) {
      throw new Error("Invalid email or password.");
    }
    await createSession(response, user2.id);
    return authUserSchema.parse(user2);
  }
  const user = Array.from(memoryStore.users.values()).find(
    (candidate) => candidate.email === email
  );
  if (!user) {
    throw new Error("Invalid email or password.");
  }
  const isValid = await bcrypt.compare(parsed.password, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid email or password.");
  }
  await createSession(response, user.id);
  return authUserSchema.parse(user);
}
async function getAuthenticatedUser(request) {
  const token = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!token) return null;
  const tokenHash = hashToken(token);
  if (db && isDatabaseConfigured) {
    const sessions = await db.select().from(authSessions).where(eq(authSessions.tokenHash, tokenHash)).limit(1);
    const session2 = sessions[0];
    if (!session2 || session2.expiresAt < /* @__PURE__ */ new Date()) {
      return null;
    }
    const usersFound = await db.select().from(users).where(eq(users.id, session2.userId)).limit(1);
    const user2 = usersFound[0];
    return user2 ? authUserSchema.parse(user2) : null;
  }
  const session = memoryStore.sessions.get(tokenHash);
  if (!session || session.expiresAt < /* @__PURE__ */ new Date()) {
    return null;
  }
  const user = memoryStore.users.get(session.userId);
  return user ? authUserSchema.parse(user) : null;
}
async function logoutUser(request, response) {
  const token = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!token) {
    clearSessionCookie(response);
    return;
  }
  const tokenHash = hashToken(token);
  if (db && isDatabaseConfigured) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
  } else {
    memoryStore.sessions.delete(tokenHash);
  }
  clearSessionCookie(response);
}
async function cleanupExpiredSessions() {
  if (db && isDatabaseConfigured) {
    await db.delete(authSessions).where(lt(authSessions.expiresAt, /* @__PURE__ */ new Date()));
    return;
  }
  for (const [tokenHash, session] of Array.from(memoryStore.sessions.entries())) {
    if (session.expiresAt < /* @__PURE__ */ new Date()) {
      memoryStore.sessions.delete(tokenHash);
    }
  }
}

// server/indiaJobs.ts
import { desc, eq as eq2, inArray } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import { nanoid as nanoid2 } from "nanoid";

// server/ollama.ts
import { z as z2 } from "zod";
var expansionSchema = z2.object({
  expansions: z2.array(z2.string()).max(6),
  notes: z2.string().optional()
});
function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}
async function getOllamaSearchExpansions(search) {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL;
  if (!baseUrl || !model || !search.trim()) {
    return {
      enabled: false,
      model,
      notes: "Set OLLAMA_BASE_URL and OLLAMA_MODEL to enable local query expansion.",
      expansions: []
    };
  }
  try {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        stream: false,
        prompt: `You help a job search product expand user queries into practical keyword variations for internet job search APIs.
Return strict JSON with this exact shape: {"expansions":["..."],"notes":"..."}.
The expansions should be concise and useful for finding internships, full-time roles, and research opportunities.
Search query: ${search}`
      })
    });
    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }
    const raw = await response.json();
    const parsed = expansionSchema.safeParse(JSON.parse(raw.response ?? "{}"));
    if (!parsed.success) {
      throw new Error("Ollama response did not match expected schema");
    }
    return {
      enabled: true,
      model,
      notes: parsed.data.notes,
      expansions: parsed.data.expansions
    };
  } catch (error) {
    return {
      enabled: false,
      model,
      notes: error instanceof Error ? `Ollama was configured but unavailable: ${error.message}` : "Ollama was configured but unavailable.",
      expansions: []
    };
  }
}

// server/indiaJobs.ts
var INDIAN_CITIES = [
  "Bengaluru, India",
  "Bangalore, India",
  "Chennai, India",
  "Hyderabad, India",
  "Mumbai, India",
  "Pune, India",
  "Gurgaon, India",
  "Noida, India",
  "New Delhi, India",
  "Kolkata, India",
  "Ahmedabad, India"
];
var JOBICY_KEYWORDS = [
  "india",
  "bangalore",
  "bengaluru",
  "chennai",
  "hyderabad",
  "mumbai",
  "pune",
  "gurgaon",
  "noida",
  "delhi"
];
function hasRealConfigValue(value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !(normalized.startsWith("your_") || normalized.includes("placeholder") || normalized === "changeme");
}
function stripHtml(input) {
  if (!input) return "";
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function inferTrack(title, description) {
  const corpus = `${title} ${description}`.toLowerCase();
  if (/(intern|internship|trainee|apprentice)/i.test(corpus)) return "internship";
  if (/(research|researcher|scientist|phd|lab|associate professor|fellow)/i.test(corpus)) {
    return "research";
  }
  return "full-time";
}
function getStartupScore(input) {
  const corpus = [input.title, input.company, input.summary, ...input.tags].join(" ").toLowerCase();
  let score = 0;
  const signals = [
    [/\bstartup\b|\bstart-up\b/, 50],
    [/\bfounding\b/, 38],
    [/\bseed\b|\bseries a\b|\bseries b\b/, 18],
    [/\bearly[- ]stage\b|\bventure\b|\bfast[- ]growing\b/, 16],
    [/\by combinator\b|\byc\b/, 22]
  ];
  for (const [pattern, weight] of signals) {
    if (pattern.test(corpus)) score += weight;
  }
  return Math.min(100, score);
}
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return void 0;
  }
}
function isIndiaLocation(value) {
  return /(india|bengaluru|bangalore|chennai|hyderabad|mumbai|pune|gurgaon|noida|delhi|kolkata|ahmedabad)/i.test(
    value
  );
}
function getStateAndCity(location) {
  const display = typeof location === "string" ? location : location?.display_name ?? "India";
  const parts = display.split(",").map((part) => part.trim());
  return {
    location: display,
    city: parts[0] || void 0,
    state: parts[1] || parts[0] || void 0
  };
}
function buildCompensation(job) {
  if (!job.salary_min && !job.salary_max) return void 0;
  if (job.salary_min && job.salary_max) {
    return `INR ${Math.round(job.salary_min).toLocaleString("en-IN")} - ${Math.round(
      job.salary_max
    ).toLocaleString("en-IN")}`;
  }
  if (job.salary_min) {
    return `From INR ${Math.round(job.salary_min).toLocaleString("en-IN")}`;
  }
  return `Up to INR ${Math.round(job.salary_max).toLocaleString("en-IN")}`;
}
function normalizeAdzunaOpportunity(job) {
  const summary = stripHtml(job.description);
  const { location, state, city } = getStateAndCity(job.location);
  const tags = [
    job.category?.label,
    job.category?.tag,
    inferTrack(job.title, summary),
    location
  ].filter(Boolean);
  const startupScore = getStartupScore({
    title: job.title,
    company: job.company?.display_name ?? "Unknown company",
    summary,
    tags
  });
  return {
    id: `adzuna-${job.id}`,
    title: job.title,
    company: job.company?.display_name ?? "Unknown company",
    location,
    summary,
    employmentType: [job.contract_time, job.contract_type].filter(Boolean).join(", ") || "Not specified",
    track: inferTrack(job.title, summary),
    tags,
    compensation: buildCompensation(job),
    remote: /remote|hybrid/i.test(location) || /remote|hybrid/i.test(summary),
    country: "India",
    state,
    city,
    visaSponsorship: /visa|sponsor/i.test(summary),
    startup: startupScore >= 50,
    startupScore,
    source: "adzuna",
    sourceLabel: "Jobs by Adzuna",
    sourceUrl: job.redirect_url,
    officialApplyUrl: job.redirect_url,
    applyDomain: extractDomain(job.redirect_url),
    postedAt: job.created,
    researchDomain: inferTrack(job.title, summary) === "research" ? job.category?.label ?? "Research" : void 0
  };
}
function normalizeTheMuseOpportunity(job) {
  const landingPage = job.refs?.landing_page;
  if (!landingPage) return null;
  const locationNames = (job.locations ?? []).map((item) => item.name).filter(Boolean);
  const hasIndiaLocation = locationNames.some((location2) => isIndiaLocation(location2));
  if (!hasIndiaLocation) return null;
  const preferredLocation = locationNames.find((location2) => isIndiaLocation(location2) && !/remote/i.test(location2)) ?? locationNames[0] ?? "India";
  const summary = stripHtml(job.contents);
  const { location, state, city } = getStateAndCity(preferredLocation);
  const tags = [
    ...(job.categories ?? []).map((item) => item.name).filter(Boolean),
    ...(job.levels ?? []).map((item) => item.name).filter(Boolean),
    ...(job.tags ?? []).map((item) => item.name).filter(Boolean)
  ];
  const startupScore = getStartupScore({
    title: job.name,
    company: job.company?.name ?? "Unknown company",
    summary,
    tags
  });
  return {
    id: `themuse-${job.id}`,
    title: job.name,
    company: job.company?.name ?? "Unknown company",
    location,
    summary,
    employmentType: job.type || "Not specified",
    track: inferTrack(job.name, summary),
    tags,
    remote: /remote/i.test(location),
    country: "India",
    state,
    city,
    visaSponsorship: /visa|sponsor/i.test(summary),
    startup: startupScore >= 50,
    startupScore,
    source: "themuse",
    sourceLabel: "The Muse",
    sourceUrl: landingPage,
    officialApplyUrl: landingPage,
    applyDomain: extractDomain(landingPage),
    postedAt: job.publication_date,
    researchDomain: inferTrack(job.name, summary) === "research" ? tags.find((tag) => /research|science/i.test(tag)) ?? "Research" : void 0
  };
}
function normalizeRemotiveOpportunity(job) {
  const locationText = job.candidate_required_location ?? "";
  if (!isIndiaLocation(locationText)) {
    return null;
  }
  const summary = stripHtml(job.description);
  const { location, state, city } = getStateAndCity(locationText);
  const tags = [.../* @__PURE__ */ new Set([...job.tags ?? [], job.category ?? "", "Remote"])].filter(Boolean);
  const startupScore = getStartupScore({
    title: job.title,
    company: job.company_name,
    summary,
    tags
  });
  return {
    id: `remotive-${job.id}`,
    title: job.title,
    company: job.company_name,
    logoUrl: job.company_logo,
    location,
    summary,
    employmentType: job.job_type || "Not specified",
    track: inferTrack(job.title, summary),
    tags,
    compensation: job.salary || void 0,
    remote: true,
    country: "India",
    state,
    city,
    visaSponsorship: /visa|sponsor/i.test(summary),
    startup: startupScore >= 50,
    startupScore,
    source: "remotive",
    sourceLabel: "Remotive",
    sourceUrl: job.url,
    officialApplyUrl: job.url,
    applyDomain: extractDomain(job.url),
    postedAt: job.publication_date,
    researchDomain: inferTrack(job.title, summary) === "research" ? job.category ?? "Research" : void 0
  };
}
function normalizeJobicyOpportunity(job, keyword) {
  const link = job.link?.trim();
  const title = job.title?.trim();
  if (!link || !title) return null;
  const summary = stripHtml(job.description);
  const combined = `${title} ${summary} ${keyword}`;
  if (!isIndiaLocation(combined)) {
    return null;
  }
  const tags = Array.isArray(job.category) ? job.category.filter(Boolean) : job.category ? [job.category] : [];
  const startupScore = getStartupScore({
    title,
    company: "Remote Company",
    summary,
    tags
  });
  const { location, state, city } = getStateAndCity(keyword.includes("india") ? "India" : `${keyword}, India`);
  return {
    id: `jobicy-${Buffer.from(link).toString("base64url").slice(0, 40)}`,
    title,
    company: "Remote Company",
    location,
    summary,
    employmentType: /contract/i.test(summary) ? "Contract" : /part-time/i.test(summary) ? "Part-time" : "Full-time",
    track: inferTrack(title, summary),
    tags,
    remote: true,
    country: "India",
    state,
    city,
    visaSponsorship: /visa|sponsor/i.test(summary),
    startup: startupScore >= 50,
    startupScore,
    source: "jobicy",
    sourceLabel: "Jobicy",
    sourceUrl: link,
    officialApplyUrl: link,
    applyDomain: extractDomain(link),
    postedAt: job.pubDate ? new Date(job.pubDate).toISOString() : void 0,
    researchDomain: inferTrack(title, summary) === "research" ? tags.find((tag) => /research|science/i.test(tag)) ?? "Research" : void 0
  };
}
async function fetchAdzunaPage(page, what, where) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!hasRealConfigValue(appId) || !hasRealConfigValue(appKey)) {
    return [];
  }
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/in/search/${page}`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "20");
  url.searchParams.set("what", what);
  url.searchParams.set("content-type", "application/json");
  url.searchParams.set("sort_by", "date");
  if (where) url.searchParams.set("where", where);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobConnect India/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Adzuna request failed with ${response.status}`);
  }
  const data = await response.json();
  return (data.results ?? []).map(normalizeAdzunaOpportunity);
}
async function fetchTheMusePage(page, location) {
  const url = new URL("https://www.themuse.com/api/public/jobs");
  url.searchParams.set("page", String(page));
  url.searchParams.set("location", location);
  if (process.env.THE_MUSE_API_KEY) {
    url.searchParams.set("api_key", process.env.THE_MUSE_API_KEY);
  }
  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobConnect India/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`The Muse request failed with ${response.status}`);
  }
  const data = await response.json();
  return (data.results ?? []).map(normalizeTheMuseOpportunity).filter(Boolean);
}
async function fetchRemotiveIndia(searchTerm) {
  const url = new URL("https://remotive.com/api/remote-jobs");
  url.searchParams.set("search", searchTerm);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobConnect India/1.0"
    }
  });
  if (!response.ok) {
    throw new Error(`Remotive request failed with ${response.status}`);
  }
  const data = await response.json();
  return (data.jobs ?? []).map(normalizeRemotiveOpportunity).filter(Boolean);
}
async function fetchJobicyFeed(keyword) {
  const url = new URL("https://jobicy.com/feed/job_feed");
  url.searchParams.set("search_region", "apac");
  url.searchParams.set("search_keywords", keyword);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobConnect India/1.0",
      Accept: "application/rss+xml, application/xml, text/xml"
    }
  });
  if (!response.ok) {
    throw new Error(`Jobicy request failed with ${response.status}`);
  }
  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true
  });
  const parsed = parser.parse(xml);
  const items = parsed.rss?.channel?.item;
  const normalizedItems = Array.isArray(items) ? items : items ? [items] : [];
  return normalizedItems.map((item) => normalizeJobicyOpportunity(item, keyword)).filter(Boolean);
}
function dedupeOpportunities(items) {
  const seen = /* @__PURE__ */ new Set();
  return items.filter((item) => {
    const key = `${item.company}-${item.title}-${item.officialApplyUrl}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function buildDashboardStats(opportunities) {
  const topTags = Object.entries(
    opportunities.reduce((acc, opportunity) => {
      for (const tag of opportunity.tags.slice(0, 5)) {
        acc[tag] = (acc[tag] ?? 0) + 1;
      }
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, count]) => ({ tag, count }));
  const startupCompanies = Object.values(
    opportunities.reduce((acc, opportunity) => {
      if (!opportunity.startup) return acc;
      const current = acc[opportunity.company] ?? {
        company: opportunity.company,
        openings: 0,
        averageStartupScore: 0,
        total: 0
      };
      current.openings += 1;
      current.total += opportunity.startupScore;
      current.averageStartupScore = Math.round(current.total / current.openings);
      acc[opportunity.company] = current;
      return acc;
    }, {})
  ).map(({ total, ...rest }) => rest).sort((a, b) => b.averageStartupScore - a.averageStartupScore).slice(0, 6);
  return {
    total: opportunities.length,
    internships: opportunities.filter((item) => item.track === "internship").length,
    fullTime: opportunities.filter((item) => item.track === "full-time").length,
    research: opportunities.filter((item) => item.track === "research").length,
    startups: opportunities.filter((item) => item.startup).length,
    remoteFriendly: opportunities.filter((item) => item.remote).length,
    visaSponsorship: opportunities.filter((item) => item.visaSponsorship).length,
    topTags,
    startupCompanies
  };
}
async function saveSyncRun(status, fetchedCount, insertedCount, notes) {
  if (db && isDatabaseConfigured) {
    await db.insert(syncRuns).values({
      id: nanoid2(),
      source: "india-aggregator",
      status,
      fetchedCount,
      insertedCount,
      notes
    });
  }
}
async function collectLiveIndiaOpportunities() {
  const remotiveQueries = [
    "india",
    "internship india",
    "research india",
    "software engineer india",
    "machine learning india",
    "data analyst india",
    "backend engineer india",
    "frontend engineer india"
  ];
  try {
    const museResults = (await Promise.all(
      INDIAN_CITIES.flatMap((location) => [
        fetchTheMusePage(1, location).catch(() => []),
        fetchTheMusePage(2, location).catch(() => [])
      ])
    )).flat();
    const remotiveResults = (await Promise.all(remotiveQueries.map((query) => fetchRemotiveIndia(query).catch(() => [])))).flat();
    const jobicyResults = (await Promise.all(JOBICY_KEYWORDS.map((keyword) => fetchJobicyFeed(keyword).catch(() => [])))).flat();
    const adzunaResults = hasRealConfigValue(process.env.ADZUNA_APP_ID) && hasRealConfigValue(process.env.ADZUNA_APP_KEY) ? (await Promise.all(
      ["software engineer", "internship", "research engineer", "data analyst"].flatMap(
        (query) => [
          fetchAdzunaPage(1, query).catch(() => []),
          fetchAdzunaPage(2, query).catch(() => [])
        ]
      )
    )).flat() : [];
    const opportunities = dedupeOpportunities([
      ...museResults,
      ...remotiveResults,
      ...jobicyResults,
      ...adzunaResults
    ]);
    return {
      opportunities,
      fetchedCount: museResults.length + remotiveResults.length + jobicyResults.length + adzunaResults.length
    };
  } catch (error) {
    throw error;
  }
}
async function collectFastIndiaFallback() {
  const museResults = (await Promise.all([
    fetchTheMusePage(1, "Chennai, India").catch(() => []),
    fetchTheMusePage(1, "Bengaluru, India").catch(() => []),
    fetchTheMusePage(1, "Hyderabad, India").catch(() => [])
  ])).flat();
  const remotiveResults = (await Promise.all([
    fetchRemotiveIndia("india").catch(() => []),
    fetchRemotiveIndia("internship india").catch(() => [])
  ])).flat();
  const jobicyResults = (await Promise.all([
    fetchJobicyFeed("india").catch(() => []),
    fetchJobicyFeed("bangalore").catch(() => [])
  ])).flat();
  return dedupeOpportunities([
    ...museResults,
    ...remotiveResults,
    ...jobicyResults
  ]).slice(0, 60);
}
async function syncIndiaOpportunities() {
  try {
    const { opportunities, fetchedCount } = await collectLiveIndiaOpportunities();
    if (db && isDatabaseConfigured) {
      for (const opportunity of opportunities) {
        await db.insert(jobs).values({
          id: opportunity.id,
          companyId: null,
          companyName: opportunity.company,
          title: opportunity.title,
          track: opportunity.track,
          employmentType: opportunity.employmentType,
          location: opportunity.location,
          country: "India",
          state: opportunity.state ?? null,
          city: opportunity.city ?? null,
          summary: opportunity.summary,
          tags: opportunity.tags,
          compensation: opportunity.compensation ?? null,
          remote: opportunity.remote,
          visaSponsorship: opportunity.visaSponsorship,
          startupScore: opportunity.startupScore,
          startup: opportunity.startup,
          source: opportunity.source,
          sourceLabel: opportunity.sourceLabel,
          sourceUrl: opportunity.sourceUrl,
          officialApplyUrl: opportunity.officialApplyUrl,
          applyDomain: opportunity.applyDomain ?? null,
          researchDomain: opportunity.researchDomain ?? null,
          isActive: true,
          postedAt: opportunity.postedAt ? new Date(opportunity.postedAt) : null,
          lastSyncedAt: /* @__PURE__ */ new Date()
        }).onConflictDoUpdate({
          target: jobs.id,
          set: {
            companyName: opportunity.company,
            title: opportunity.title,
            track: opportunity.track,
            employmentType: opportunity.employmentType,
            location: opportunity.location,
            country: "India",
            state: opportunity.state ?? null,
            city: opportunity.city ?? null,
            summary: opportunity.summary,
            tags: opportunity.tags,
            compensation: opportunity.compensation ?? null,
            remote: opportunity.remote,
            visaSponsorship: opportunity.visaSponsorship,
            startupScore: opportunity.startupScore,
            startup: opportunity.startup,
            source: opportunity.source,
            sourceLabel: opportunity.sourceLabel,
            sourceUrl: opportunity.sourceUrl,
            officialApplyUrl: opportunity.officialApplyUrl,
            applyDomain: opportunity.applyDomain ?? null,
            researchDomain: opportunity.researchDomain ?? null,
            isActive: true,
            postedAt: opportunity.postedAt ? new Date(opportunity.postedAt) : null,
            lastSyncedAt: /* @__PURE__ */ new Date()
          }
        });
      }
      const opportunityIds = opportunities.map((item) => item.id);
      if (opportunityIds.length > 0) {
        await db.update(jobs).set({
          isActive: false
        }).where(eq2(jobs.isActive, true));
        await db.update(jobs).set({
          isActive: true
        }).where(inArray(jobs.id, opportunityIds));
      }
      await saveSyncRun(
        "success",
        fetchedCount,
        opportunities.length
      );
    } else {
      memoryStore.opportunities = opportunities;
      memoryStore.lastSyncAt = /* @__PURE__ */ new Date();
    }
    return opportunities.length;
  } catch (error) {
    await saveSyncRun(
      "failed",
      0,
      0,
      error instanceof Error ? error.message : "Unknown sync error"
    );
    throw error;
  }
}
function filterOpportunities(opportunities, query) {
  return opportunities.filter((opportunity) => {
    if (query.track && query.track !== "all" && opportunity.track !== query.track) {
      return false;
    }
    if (query.startupsOnly && !opportunity.startup) {
      return false;
    }
    if (query.search && ![
      opportunity.title,
      opportunity.company,
      opportunity.summary,
      opportunity.tags.join(" ")
    ].join(" ").toLowerCase().includes(query.search.toLowerCase())) {
      return false;
    }
    if (query.location && !opportunity.location.toLowerCase().includes(query.location.toLowerCase())) {
      return false;
    }
    return true;
  });
}
async function getStoredOpportunities() {
  if (db && isDatabaseConfigured) {
    const rows = await db.select().from(jobs).where(eq2(jobs.isActive, true)).orderBy(desc(jobs.postedAt));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.companyName,
      location: row.location,
      summary: row.summary,
      employmentType: row.employmentType,
      track: row.track,
      tags: row.tags ?? [],
      compensation: row.compensation ?? void 0,
      remote: row.remote,
      country: "India",
      state: row.state ?? void 0,
      city: row.city ?? void 0,
      visaSponsorship: row.visaSponsorship,
      startup: row.startup,
      startupScore: row.startupScore,
      source: row.source,
      sourceLabel: row.sourceLabel,
      sourceUrl: row.sourceUrl,
      officialApplyUrl: row.officialApplyUrl,
      applyDomain: row.applyDomain ?? void 0,
      postedAt: row.postedAt?.toISOString(),
      researchDomain: row.researchDomain ?? void 0
    }));
  }
  return memoryStore.opportunities;
}
async function getLastSyncDate() {
  if (db && isDatabaseConfigured) {
    const latest = await db.query.syncRuns.findFirst({
      orderBy: desc(syncRuns.createdAt)
    });
    return latest?.createdAt ?? null;
  }
  return memoryStore.lastSyncAt;
}
async function getIndiaOpportunities(query) {
  const ai = await getOllamaSearchExpansions(query.search ?? "");
  const lastSync = await getLastSyncDate();
  const needsSync = !lastSync || Date.now() - new Date(lastSync).getTime() > 1e3 * 60 * 60 * 6;
  if (needsSync) {
    try {
      await syncIndiaOpportunities();
    } catch {
    }
  }
  let opportunities = await getStoredOpportunities();
  if (opportunities.length === 0) {
    try {
      opportunities = await collectFastIndiaFallback();
    } catch {
    }
  }
  const searchTerms = [query.search, ...ai.expansions ?? []].filter(Boolean);
  if (searchTerms.length > 1) {
    opportunities = opportunities.filter(
      (opportunity) => searchTerms.some(
        (term) => [opportunity.title, opportunity.company, opportunity.summary, opportunity.tags.join(" ")].join(" ").toLowerCase().includes(term.toLowerCase())
      )
    );
  }
  opportunities = filterOpportunities(opportunities, query).sort((a, b) => {
    if (query.startupsOnly) return b.startupScore - a.startupScore;
    return new Date(b.postedAt ?? 0).getTime() - new Date(a.postedAt ?? 0).getTime();
  });
  return {
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
    query,
    ai,
    stats: buildDashboardStats(opportunities),
    opportunities
  };
}

// server/routes.ts
function hasRealConfigValue2(value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !(normalized.startsWith("your_") || normalized.includes("placeholder") || normalized === "changeme");
}
function getTrack(value) {
  const parsed = trackSchema.safeParse(value);
  return parsed.success ? parsed.data : void 0;
}
function registerRoutes(app) {
  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      now: (/* @__PURE__ */ new Date()).toISOString(),
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      adzunaConfigured: hasRealConfigValue2(process.env.ADZUNA_APP_ID) && hasRealConfigValue2(process.env.ADZUNA_APP_KEY),
      ollamaConfigured: Boolean(
        process.env.OLLAMA_BASE_URL && process.env.OLLAMA_MODEL
      )
    });
  });
  app.get("/api/auth/me", async (request, response) => {
    const user = await getAuthenticatedUser(request);
    response.json({ user });
  });
  app.post("/api/auth/register", async (request, response) => {
    try {
      const user = await registerUser(request.body, response);
      response.status(201).json({ user });
    } catch (error) {
      response.status(400).json({
        message: error instanceof Error ? error.message : "Registration failed"
      });
    }
  });
  app.post("/api/auth/login", async (request, response) => {
    try {
      const user = await loginUser(request.body, response);
      response.json({ user });
    } catch (error) {
      response.status(401).json({
        message: error instanceof Error ? error.message : "Login failed"
      });
    }
  });
  app.post("/api/auth/logout", async (request, response) => {
    await logoutUser(request, response);
    response.status(204).end();
  });
  app.get("/api/opportunities", async (request, response) => {
    try {
      const data = await getIndiaOpportunities({
        search: typeof request.query.search === "string" ? request.query.search : void 0,
        location: typeof request.query.location === "string" ? request.query.location : void 0,
        track: getTrack(request.query.track),
        startupsOnly: request.query.startupsOnly === "true" || request.query.startupsOnly === "1"
      });
      response.json(data);
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Unable to fetch opportunities"
      });
    }
  });
  app.get("/api/dashboard", async (request, response) => {
    try {
      const data = await getIndiaOpportunities({
        search: typeof request.query.search === "string" ? request.query.search : void 0,
        location: typeof request.query.location === "string" ? request.query.location : void 0
      });
      response.json({
        fetchedAt: data.fetchedAt,
        ai: data.ai,
        stats: data.stats,
        featuredStartups: data.opportunities.filter((item) => item.startup).slice(0, 8),
        featuredResearch: data.opportunities.filter((item) => item.track === "research").slice(0, 6)
      });
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Unable to build dashboard"
      });
    }
  });
  app.get("/api/cron/sync-opportunities", async (request, response) => {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.authorization;
    const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}` || request.headers["x-vercel-cron"] === "1" || request.headers["user-agent"] === "vercel-cron/1.0";
    if (!isAuthorized) {
      return response.status(401).json({ message: "Unauthorized cron request" });
    }
    try {
      const synced = await syncIndiaOpportunities();
      response.json({
        ok: true,
        synced,
        now: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Sync failed"
      });
    }
  });
}

// server/app.ts
async function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  await cleanupExpiredSessions();
  registerRoutes(app);
  app.use(
    (error, _request, response, _next) => {
      console.error(error);
      response.status(500).json({
        message: error.message || "Unexpected server error"
      });
    }
  );
  return app;
}

// server/vite.ts
import express2 from "express";
import fs from "node:fs";
import path from "node:path";
import { createServer as createViteServer } from "vite";
var root = process.cwd();
async function setupVite(app) {
  const vite = await createViteServer({
    configFile: path.resolve(root, "vite.config.ts"),
    server: {
      middlewareMode: true
    },
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (request, response, next) => {
    const url = request.originalUrl;
    if (url.startsWith("/api")) {
      return next();
    }
    try {
      const templatePath = path.resolve(root, "client", "index.html");
      const template = fs.readFileSync(templatePath, "utf-8");
      const html = await vite.transformIndexHtml(url, template);
      response.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error);
      next(error);
    }
  });
}
function serveStatic(app) {
  const distPath = path.resolve(root, "dist", "public");
  app.use(express2.static(distPath));
  app.use("*", (request, response, next) => {
    if (request.originalUrl.startsWith("/api")) {
      return next();
    }
    response.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
async function startServer() {
  const app = await createApp();
  const defaultPort = Number(process.env.PORT ?? 3e3);
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app);
  }
  const server = http.createServer(app);
  const listen = (port) => new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.removeListener("error", reject);
      console.log(`JobConnect server listening on http://localhost:${port}`);
      console.log(`Workspace root: ${path2.resolve(__dirname, "..")}`);
      resolve();
    });
  });
  const findAvailablePort = async (startingPort, attemptsLeft = 10) => {
    try {
      await listen(startingPort);
      return;
    } catch (error) {
      const isPortInUse = typeof error === "object" && error !== null && "code" in error && error.code === "EADDRINUSE";
      if (!isPortInUse || attemptsLeft <= 0 || process.env.PORT) {
        throw error;
      }
      const nextPort = startingPort + 1;
      console.warn(
        `Port ${startingPort} is already in use. Trying http://localhost:${nextPort}`
      );
      await findAvailablePort(nextPort, attemptsLeft - 1);
    }
  };
  await findAvailablePort(defaultPort);
}
startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
