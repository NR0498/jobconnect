import express, { type Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { createServer as createViteServer } from "vite";

const root = process.cwd();

export async function setupVite(app: Express) {
  const vite = await createViteServer({
    configFile: path.resolve(root, "vite.config.ts"),
    server: {
      middlewareMode: true,
    },
    appType: "custom",
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
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(root, "dist", "public");

  app.use(express.static(distPath));

  app.use("*", (request, response, next) => {
    if (request.originalUrl.startsWith("/api")) {
      return next();
    }

    response.sendFile(path.resolve(distPath, "index.html"));
  });
}
