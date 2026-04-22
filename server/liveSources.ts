import type { DashboardStats, Opportunity, Track } from "../shared/schema";
import { seedOpportunities } from "./seed";
import { getOllamaSearchExpansions } from "./ollama";

type FeedQuery = {
  search?: string;
  location?: string;
  track?: Track;
  startupsOnly?: boolean;
};

type RemotiveResponse = {
  jobs?: Array<{
    id: number;
    title: string;
    company_name: string;
    company_logo_url?: string;
    category?: string;
    candidate_required_location?: string;
    description?: string;
    job_type?: string;
    publication_date?: string;
    salary?: string;
    tags?: string[];
    url: string;
  }>;
};

type ArbeitnowResponse = {
  data?: Array<{
    slug: string;
    company_name: string;
    title: string;
    description?: string;
    remote?: boolean;
    location?: string;
    url: string;
    tags?: string[];
    job_types?: string[];
    visa_sponsorship?: boolean;
    created_at?: number;
  }>;
};

function stripHtml(input: string | undefined) {
  if (!input) return "";
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toTrack(text: string): Opportunity["track"] {
  const value = text.toLowerCase();
  if (
    value.includes("intern") ||
    value.includes("trainee") ||
    value.includes("apprentice")
  ) {
    return "internship";
  }

  if (
    value.includes("research") ||
    value.includes("scientist") ||
    value.includes("phd") ||
    value.includes("university") ||
    value.includes("lab") ||
    value.includes("fellow")
  ) {
    return "research";
  }

  return "full-time";
}

function getStartupScore(input: {
  title: string;
  company: string;
  summary: string;
  tags: string[];
}) {
  const corpus = [input.title, input.company, input.summary, ...input.tags]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const weightedSignals: Array<[string, number]> = [
    ["startup", 50],
    ["start-up", 50],
    ["founding", 40],
    ["seed", 20],
    ["series a", 18],
    ["venture", 16],
    ["yc", 24],
    ["y combinator", 24],
    ["fast-growing", 14],
    ["early-stage", 20],
  ];

  for (const [signal, weight] of weightedSignals) {
    if (corpus.includes(signal)) {
      score += weight;
    }
  }

  return Math.min(score, 100);
}

function dedupeOpportunities(opportunities: Opportunity[]) {
  const seen = new Set<string>();

  return opportunities.filter((opportunity) => {
    const key = `${opportunity.company}-${opportunity.title}-${opportunity.sourceUrl}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function matchesFilters(opportunity: Opportunity, query: FeedQuery) {
  const haystack = [
    opportunity.title,
    opportunity.company,
    opportunity.location,
    opportunity.summary,
    opportunity.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  if (query.search && !haystack.includes(query.search.toLowerCase())) {
    return false;
  }

  if (
    query.location &&
    !opportunity.location.toLowerCase().includes(query.location.toLowerCase())
  ) {
    return false;
  }

  if (query.track && query.track !== "all" && opportunity.track !== query.track) {
    return false;
  }

  if (query.startupsOnly && !opportunity.startup) {
    return false;
  }

  return true;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobConnect/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} for ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchRemotive(searchTerms: string[]) {
  const terms = searchTerms.length > 0 ? searchTerms : [""];

  const responses = await Promise.all(
    terms.map((term) =>
      fetchJson<RemotiveResponse>(
        `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}`,
      ).catch(() => ({ jobs: [] })),
    ),
  );

  const jobs = responses.flatMap((response) => response.jobs ?? []).slice(0, 60);

  return jobs.map<Opportunity>((job) => {
    const summary = stripHtml(job.description);
    const tags = [...new Set([...(job.tags ?? []), job.category ?? job.job_type ?? ""])].filter(Boolean);
    const startupScore = getStartupScore({
      title: job.title,
      company: job.company_name,
      summary,
      tags,
    });

    return {
      id: `remotive-${job.id}`,
      title: job.title,
      company: job.company_name,
      logoUrl: job.company_logo_url,
      location: job.candidate_required_location || "Remote",
      summary,
      employmentType: job.job_type || "Not specified",
      track: toTrack(`${job.title} ${summary} ${job.category ?? ""}`),
      tags,
      compensation: job.salary || undefined,
      remote: true,
      visaSponsorship: /visa|sponsor/i.test(summary),
      startup: startupScore >= 50,
      startupScore,
      source: "remotive",
      sourceUrl: job.url,
      postedAt: job.publication_date,
      researchDomain:
        /research|scientist/i.test(`${job.title} ${summary}`) ? job.category : undefined,
    };
  });
}

async function fetchArbeitnow(searchTerms: string[]) {
  const terms = searchTerms.length > 0 ? searchTerms : [""];

  const responses = await Promise.all(
    terms.map((term) =>
      fetchJson<ArbeitnowResponse>(
        `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(term)}`,
      ).catch(() => ({ data: [] })),
    ),
  );

  const jobs = responses.flatMap((response) => response.data ?? []).slice(0, 60);

  return jobs.map<Opportunity>((job) => {
    const summary = stripHtml(job.description);
    const tags = [...new Set([...(job.tags ?? []), ...(job.job_types ?? [])])];
    const startupScore = getStartupScore({
      title: job.title,
      company: job.company_name,
      summary,
      tags,
    });

    return {
      id: `arbeitnow-${job.slug}`,
      title: job.title,
      company: job.company_name,
      location: job.location || (job.remote ? "Remote" : "Location not specified"),
      summary,
      employmentType: job.job_types?.join(", ") || "Not specified",
      track: toTrack(`${job.title} ${summary} ${tags.join(" ")}`),
      tags,
      remote: Boolean(job.remote),
      visaSponsorship: Boolean(job.visa_sponsorship),
      startup: startupScore >= 50,
      startupScore,
      source: "arbeitnow",
      sourceUrl: job.url,
      postedAt: job.created_at
        ? new Date(job.created_at * 1000).toISOString()
        : undefined,
      researchDomain:
        /research|scientist/i.test(`${job.title} ${summary}`) ? "Research" : undefined,
    };
  });
}

export function buildDashboardStats(opportunities: Opportunity[]): DashboardStats {
  const topTags = Object.entries(
    opportunities.reduce<Record<string, number>>((accumulator, opportunity) => {
      for (const tag of opportunity.tags.slice(0, 5)) {
        const key = tag.trim();
        if (!key) continue;
        accumulator[key] = (accumulator[key] ?? 0) + 1;
      }
      return accumulator;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  const startupCompanies = Object.values(
    opportunities.reduce<
      Record<
        string,
        { company: string; openings: number; averageStartupScore: number; total: number }
      >
    >((accumulator, opportunity) => {
      if (!opportunity.startup) return accumulator;

      const current = accumulator[opportunity.company] ?? {
        company: opportunity.company,
        openings: 0,
        averageStartupScore: 0,
        total: 0,
      };

      current.openings += 1;
      current.total += opportunity.startupScore;
      current.averageStartupScore = Math.round(current.total / current.openings);
      accumulator[opportunity.company] = current;
      return accumulator;
    }, {}),
  )
    .sort((left, right) => right.averageStartupScore - left.averageStartupScore)
    .slice(0, 6)
    .map(({ total, ...company }) => company);

  return {
    total: opportunities.length,
    internships: opportunities.filter((item) => item.track === "internship").length,
    fullTime: opportunities.filter((item) => item.track === "full-time").length,
    research: opportunities.filter((item) => item.track === "research").length,
    startups: opportunities.filter((item) => item.startup).length,
    remoteFriendly: opportunities.filter((item) => item.remote).length,
    visaSponsorship: opportunities.filter((item) => item.visaSponsorship).length,
    topTags,
    startupCompanies,
  };
}

export async function getLiveOpportunities(query: FeedQuery) {
  const ai = await getOllamaSearchExpansions(query.search ?? "");
  const searchTerms = [...new Set([query.search, ...(ai.expansions ?? [])].filter(Boolean))] as string[];

  const liveSources = await Promise.allSettled([
    fetchRemotive(searchTerms),
    fetchArbeitnow(searchTerms),
  ]);

  const liveResults = liveSources.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  const opportunities = dedupeOpportunities([...liveResults, ...seedOpportunities]).filter(
    (opportunity) => matchesFilters(opportunity, query),
  );

  opportunities.sort((left, right) => {
    if (query.startupsOnly) {
      return right.startupScore - left.startupScore;
    }

    return (
      new Date(right.postedAt ?? 0).getTime() - new Date(left.postedAt ?? 0).getTime()
    );
  });

  return {
    fetchedAt: new Date().toISOString(),
    query,
    ai,
    stats: buildDashboardStats(opportunities),
    opportunities,
  };
}
