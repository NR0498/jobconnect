let appPromise: ReturnType<
  typeof import("../server/app")["createApp"]
> | null = null;

export default async function handler(req: any, res: any) {
  try {
    appPromise ??= import("../server/app").then(({ createApp }) => createApp());
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error("Failed to initialize the API function.", error);
    return res.status(500).json({
      message: "The API failed to initialize.",
    });
  }
}
