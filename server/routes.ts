import type { Express, Request, Response } from "express";
import { trackSchema } from "../shared/schema";
import { getAuthenticatedUser, loginUser, logoutUser, registerUser } from "./auth";
import { getIndiaOpportunities, syncIndiaOpportunities } from "./indiaJobs";

function hasRealConfigValue(value?: string) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !(
    normalized.startsWith("your_") ||
    normalized.includes("placeholder") ||
    normalized === "changeme"
  );
}

function getTrack(value: unknown) {
  const parsed = trackSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function registerRoutes(app: Express) {
  app.get("/api/health", (_request: Request, response: Response) => {
    response.json({
      ok: true,
      now: new Date().toISOString(),
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      adzunaConfigured:
        hasRealConfigValue(process.env.ADZUNA_APP_ID) &&
        hasRealConfigValue(process.env.ADZUNA_APP_KEY),
      ollamaConfigured: Boolean(
        process.env.OLLAMA_BASE_URL && process.env.OLLAMA_MODEL,
      ),
    });
  });

  app.get("/api/auth/me", async (request: Request, response: Response) => {
    const user = await getAuthenticatedUser(request);
    response.json({ user });
  });

  app.post("/api/auth/register", async (request: Request, response: Response) => {
    try {
      const user = await registerUser(request.body, response);
      response.status(201).json({ user });
    } catch (error) {
      response.status(400).json({
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  });

  app.post("/api/auth/login", async (request: Request, response: Response) => {
    try {
      const user = await loginUser(request.body, response);
      response.json({ user });
    } catch (error) {
      response.status(401).json({
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  });

  app.post("/api/auth/logout", async (request: Request, response: Response) => {
    await logoutUser(request, response);
    response.status(204).end();
  });

  app.get("/api/opportunities", async (request: Request, response: Response) => {
    try {
      const data = await getIndiaOpportunities({
        search:
          typeof request.query.search === "string" ? request.query.search : undefined,
        location:
          typeof request.query.location === "string"
            ? request.query.location
            : undefined,
        track: getTrack(request.query.track),
        startupsOnly:
          request.query.startupsOnly === "true" ||
          request.query.startupsOnly === "1",
      });

      response.json(data);
    } catch (error) {
      response.status(500).json({
        message:
          error instanceof Error ? error.message : "Unable to fetch opportunities",
      });
    }
  });

  app.get("/api/dashboard", async (request: Request, response: Response) => {
    try {
      const data = await getIndiaOpportunities({
        search:
          typeof request.query.search === "string" ? request.query.search : undefined,
        location:
          typeof request.query.location === "string"
            ? request.query.location
            : undefined,
      });

      response.json({
        fetchedAt: data.fetchedAt,
        ai: data.ai,
        stats: data.stats,
        featuredStartups: data.opportunities.filter((item) => item.startup).slice(0, 8),
        featuredResearch: data.opportunities.filter((item) => item.track === "research").slice(0, 6),
      });
    } catch (error) {
      response.status(500).json({
        message:
          error instanceof Error ? error.message : "Unable to build dashboard",
      });
    }
  });

  app.get("/api/cron/sync-opportunities", async (request: Request, response: Response) => {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.authorization;
    const isAuthorized =
      !cronSecret ||
      authHeader === `Bearer ${cronSecret}` ||
      request.headers["x-vercel-cron"] === "1" ||
      request.headers["user-agent"] === "vercel-cron/1.0";

    if (!isAuthorized) {
      return response.status(401).json({ message: "Unauthorized cron request" });
    }

    try {
      const synced = await syncIndiaOpportunities();
      response.json({
        ok: true,
        synced,
        now: new Date().toISOString(),
      });
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Sync failed",
      });
    }
  });
}
