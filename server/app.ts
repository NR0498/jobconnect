import express, { type Express } from "express";
import { cleanupExpiredSessions } from "./auth";
import { registerRoutes } from "./routes";

export async function createApp() {
  const app: Express = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  await cleanupExpiredSessions();
  registerRoutes(app);

  app.use(
    (
      error: Error,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      response.status(500).json({
        message: error.message || "Unexpected server error",
      });
    },
  );

  return app;
}
