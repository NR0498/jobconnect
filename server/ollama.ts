import { z } from "zod";

const expansionSchema = z.object({
  expansions: z.array(z.string()).max(6),
  notes: z.string().optional(),
});

const SEARCH_GROUPS = [
  ["software engineer", "software developer", "backend engineer", "frontend engineer"],
  ["data scientist", "data analyst", "machine learning", "artificial intelligence"],
  ["intern", "internship", "trainee", "apprentice"],
  ["research", "researcher", "scientist", "research assistant"],
  ["product manager", "product analyst", "product owner"],
  ["designer", "ui designer", "ux designer", "product designer"],
  ["marketing", "growth", "digital marketing", "content marketing"],
];

function builtInExpansions(search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return [];

  const group = SEARCH_GROUPS.find((items) =>
    items.some((item) => normalized.includes(item) || item.includes(normalized)),
  );

  return group
    ? group.filter((item) => item !== normalized).slice(0, 5)
    : [];
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function getOllamaSearchExpansions(search: string) {
  const fallback = builtInExpansions(search);
  const baseUrl = process.env.OLLAMA_BASE_URL;
  const model = process.env.OLLAMA_MODEL;

  if (!search.trim()) {
    return {
      enabled: true,
      provider: "built-in" as const,
      notes: "Search intelligence is ready. Enter a role, skill, or research field.",
      expansions: [] as string[],
    };
  }

  const localOnly =
    baseUrl &&
    /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/i.test(baseUrl);

  if (!baseUrl || !model || (process.env.VERCEL && localOnly)) {
    return {
      enabled: true,
      provider: "built-in" as const,
      notes: fallback.length
        ? `Expanded with related terms: ${fallback.join(", ")}.`
        : "Using production-safe keyword intelligence.",
      expansions: fallback,
    };
  }

  try {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        prompt: `Return strict JSON: {"expansions":["..."],"notes":"..."}. Expand this India job search into at most five concise related role keywords: ${search}`,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    const raw = (await response.json()) as { response?: string };
    const parsed = expansionSchema.safeParse(JSON.parse(raw.response ?? "{}"));
    if (!parsed.success) throw new Error("Invalid Ollama response");

    return {
      enabled: true,
      provider: "ollama" as const,
      model,
      notes: parsed.data.notes,
      expansions: parsed.data.expansions,
    };
  } catch {
    return {
      enabled: true,
      provider: "built-in" as const,
      notes: fallback.length
        ? `Expanded with related terms: ${fallback.join(", ")}.`
        : "Using production-safe keyword intelligence.",
      expansions: fallback,
    };
  }
}
