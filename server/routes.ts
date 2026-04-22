import type { Express, Request, Response } from "express";
import { trackSchema } from "../shared/schema";
import { getLiveOpportunities } from "./liveSources";

function getTrack(value: unknown) {
  const parsed = trackSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function registerRoutes(app: Express) {
  app.get("/api/health", (_request: Request, response: Response) => {
    response.json({
      ok: true,
      now: new Date().toISOString(),
      ollamaConfigured: Boolean(
        process.env.OLLAMA_BASE_URL && process.env.OLLAMA_MODEL,
      ),
    });
  });

  app.get("/api/opportunities", async (request: Request, response: Response) => {
    try {
      const data = await getLiveOpportunities({
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
      const data = await getLiveOpportunities({
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
}
