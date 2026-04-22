import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { serveStatic, setupVite } from "./vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = await createApp();
  const defaultPort = Number(process.env.PORT ?? 3000);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app);
  }

  const server = http.createServer(app);

  const listen = (port: number) =>
    new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, () => {
        server.removeListener("error", reject);
        console.log(`JobConnect server listening on http://localhost:${port}`);
        console.log(`Workspace root: ${path.resolve(__dirname, "..")}`);
        resolve();
      });
    });

  const findAvailablePort = async (startingPort: number, attemptsLeft = 10) => {
    try {
      await listen(startingPort);
      return;
    } catch (error) {
      const isPortInUse =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "EADDRINUSE";

      if (!isPortInUse || attemptsLeft <= 0 || process.env.PORT) {
        throw error;
      }

      const nextPort = startingPort + 1;
      console.warn(
        `Port ${startingPort} is already in use. Trying http://localhost:${nextPort}`,
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
