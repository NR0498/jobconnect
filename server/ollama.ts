import { z } from "zod";

const expansionSchema = z.object({
  expansions: z.array(z.string()).max(6),
  notes: z.string().optional(),
});

export type OllamaExpansionResult = z.infer<typeof expansionSchema>;

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function getOllamaSearchExpansions(search: string) {
  const baseUrl = process.env.OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL;

  if (!baseUrl || !model || !search.trim()) {
    return {
      enabled: false,
      model,
      notes: "Set OLLAMA_BASE_URL and OLLAMA_MODEL to enable local query expansion.",
      expansions: [] as string[],
    };
  }

  try {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        prompt: `You help a job search product expand user queries into practical keyword variations for internet job search APIs.
Return strict JSON with this exact shape: {"expansions":["..."],"notes":"..."}.
The expansions should be concise and useful for finding internships, full-time roles, and research opportunities.
Search query: ${search}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const raw = (await response.json()) as { response?: string };
    const parsed = expansionSchema.safeParse(JSON.parse(raw.response ?? "{}"));

    if (!parsed.success) {
      throw new Error("Ollama response did not match expected schema");
    }

    return {
      enabled: true,
      model,
      notes: parsed.data.notes,
      expansions: parsed.data.expansions,
    };
  } catch (error) {
    return {
      enabled: false,
      model,
      notes:
        error instanceof Error
          ? `Ollama was configured but unavailable: ${error.message}`
          : "Ollama was configured but unavailable.",
      expansions: [] as string[],
    };
  }
}
