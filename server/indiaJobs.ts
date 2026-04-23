import { desc, eq, inArray } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import { nanoid } from "nanoid";
import type { DashboardStats, Opportunity, Track } from "../shared/schema";
import { jobs, syncRuns } from "../shared/schema";
import { db, isDatabaseConfigured } from "./db";
import { memoryStore } from "./memoryStore";
import { getOllamaSearchExpansions } from "./ollama";

type FeedQuery = {
  search?: string;
  location?: string;
  track?: Track;
  startupsOnly?: boolean;
};

type AdzunaResult = {
  id: string | number;
  title: string;
  description?: string;
  created?: string;
  redirect_url: string;
  contract_time?: string;
  contract_type?: string;
  salary_min?: number;
  salary_max?: number;
  category?: {
    label?: string;
    tag?: string;
  };
  company?: {
    display_name?: string;
  };
  location?: {
    display_name?: string;
    area?: string[];
  };
};

type AdzunaSearchResponse = {
  results?: AdzunaResult[];
};

type TheMuseLocation = {
  name?: string;
};

type TheMuseResult = {
  id: number;
  name: string;
  contents?: string;
  publication_date?: string;
  refs?: {
    landing_page?: string;
  };
  company?: {
    name?: string;
  };
  locations?: TheMuseLocation[];
  levels?: Array<{ name?: string }>;
  categories?: Array<{ name?: string }>;
  type?: string;
  tags?: Array<{ name?: string }>;
};

type TheMuseResponse = {
  results?: TheMuseResult[];
};

type RemotiveResponse = {
  jobs?: RemotiveJob[];
};

type RemotiveJob = {
  id: number;
  title: string;
  company_name: string;
  company_logo?: string;
  category?: string;
  candidate_required_location?: string;
  description?: string;
  job_type?: string;
  publication_date?: string;
  salary?: string;
  tags?: string[];
  url: string;
};

type JobicyItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  category?: string | string[];
};

const INDIAN_CITIES = [
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
  "Ahmedabad, India",
];

const JOBICY_KEYWORDS = [
  "india",
  "bangalore",
  "bengaluru",
  "chennai",
  "hyderabad",
  "mumbai",
  "pune",
  "gurgaon",
  "noida",
  "delhi",
];

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

function stripHtml(input?: string) {
  if (!input) return "";
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function inferTrack(title: string, description: string) {
  const corpus = `${title} ${description}`.toLowerCase();

  if (/(intern|internship|trainee|apprentice)/i.test(corpus)) return "internship";
  if (/(research|researcher|scientist|phd|lab|associate professor|fellow)/i.test(corpus)) {
    return "research";
  }
  return "full-time";
}

function getStartupScore(input: { title: string; company: string; summary: string; tags: string[] }) {
  const corpus = [input.title, input.company, input.summary, ...input.tags]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const signals: Array<[RegExp, number]> = [
    [/\bstartup\b|\bstart-up\b/, 50],
    [/\bfounding\b/, 38],
    [/\bseed\b|\bseries a\b|\bseries b\b/, 18],
    [/\bearly[- ]stage\b|\bventure\b|\bfast[- ]growing\b/, 16],
    [/\by combinator\b|\byc\b/, 22],
  ];

  for (const [pattern, weight] of signals) {
    if (pattern.test(corpus)) score += weight;
  }

  return Math.min(100, score);
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function isIndiaLocation(value: string) {
  return /(india|bengaluru|bangalore|chennai|hyderabad|mumbai|pune|gurgaon|noida|delhi|kolkata|ahmedabad)/i.test(
    value,
  );
}

function getStateAndCity(location?: { display_name?: string; area?: string[] } | string) {
  const display =
    typeof location === "string" ? location : location?.display_name ?? "India";
  const parts = display.split(",").map((part) => part.trim());

  return {
    location: display,
    city: parts[0] || undefined,
    state: parts[1] || parts[0] || undefined,
  };
}

function buildCompensation(job: AdzunaResult) {
  if (!job.salary_min && !job.salary_max) return undefined;
  if (job.salary_min && job.salary_max) {
    return `INR ${Math.round(job.salary_min).toLocaleString("en-IN")} - ${Math.round(
      job.salary_max,
    ).toLocaleString("en-IN")}`;
  }
  if (job.salary_min) {
    return `From INR ${Math.round(job.salary_min).toLocaleString("en-IN")}`;
  }
  return `Up to INR ${Math.round(job.salary_max as number).toLocaleString("en-IN")}`;
}

function normalizeAdzunaOpportunity(job: AdzunaResult): Opportunity {
  const summary = stripHtml(job.description);
  const { location, state, city } = getStateAndCity(job.location);
  const tags = [
    job.category?.label,
    job.category?.tag,
    inferTrack(job.title, summary),
    location,
  ].filter(Boolean) as string[];
  const startupScore = getStartupScore({
    title: job.title,
    company: job.company?.display_name ?? "Unknown company",
    summary,
    tags,
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
    researchDomain:
      inferTrack(job.title, summary) === "research" ? job.category?.label ?? "Research" : undefined,
  };
}

function normalizeTheMuseOpportunity(job: TheMuseResult): Opportunity | null {
  const landingPage = job.refs?.landing_page;
  if (!landingPage) return null;

  const locationNames = (job.locations ?? []).map((item) => item.name).filter(Boolean) as string[];
  const hasIndiaLocation = locationNames.some((location) => isIndiaLocation(location));
  if (!hasIndiaLocation) return null;

  const preferredLocation =
    locationNames.find((location) => isIndiaLocation(location) && !/remote/i.test(location)) ??
    locationNames[0] ??
    "India";
  const summary = stripHtml(job.contents);
  const { location, state, city } = getStateAndCity(preferredLocation);
  const tags = [
    ...(job.categories ?? []).map((item) => item.name).filter(Boolean),
    ...(job.levels ?? []).map((item) => item.name).filter(Boolean),
    ...(job.tags ?? []).map((item) => item.name).filter(Boolean),
  ] as string[];
  const startupScore = getStartupScore({
    title: job.name,
    company: job.company?.name ?? "Unknown company",
    summary,
    tags,
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
    researchDomain:
      inferTrack(job.name, summary) === "research"
        ? tags.find((tag) => /research|science/i.test(tag)) ?? "Research"
        : undefined,
  };
}

function normalizeRemotiveOpportunity(job: RemotiveJob): Opportunity | null {
  const locationText = job.candidate_required_location ?? "";
  if (!isIndiaLocation(locationText)) {
    return null;
  }

  const summary = stripHtml(job.description);
  const { location, state, city } = getStateAndCity(locationText);
  const tags = [...new Set([...(job.tags ?? []), job.category ?? "", "Remote"])]
    .filter(Boolean);
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
    logoUrl: job.company_logo,
    location,
    summary,
    employmentType: job.job_type || "Not specified",
    track: inferTrack(job.title, summary),
    tags,
    compensation: job.salary || undefined,
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
    researchDomain:
      inferTrack(job.title, summary) === "research"
        ? job.category ?? "Research"
        : undefined,
  };
}

function normalizeJobicyOpportunity(job: JobicyItem, keyword: string): Opportunity | null {
  const link = job.link?.trim();
  const title = job.title?.trim();
  if (!link || !title) return null;

  const summary = stripHtml(job.description);
  const combined = `${title} ${summary} ${keyword}`;
  if (!isIndiaLocation(combined)) {
    return null;
  }

  const tags = Array.isArray(job.category)
    ? job.category.filter(Boolean)
    : job.category
      ? [job.category]
      : [];
  const startupScore = getStartupScore({
    title,
    company: "Remote Company",
    summary,
    tags,
  });
  const { location, state, city } = getStateAndCity(keyword.includes("india") ? "India" : `${keyword}, India`);

  return {
    id: `jobicy-${Buffer.from(link).toString("base64url").slice(0, 40)}`,
    title,
    company: "Remote Company",
    location,
    summary,
    employmentType: /contract/i.test(summary)
      ? "Contract"
      : /part-time/i.test(summary)
        ? "Part-time"
        : "Full-time",
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
    postedAt: job.pubDate ? new Date(job.pubDate).toISOString() : undefined,
    researchDomain:
      inferTrack(title, summary) === "research"
        ? tags.find((tag) => /research|science/i.test(tag)) ?? "Research"
        : undefined,
  };
}

async function fetchAdzunaPage(page: number, what: string, where?: string) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!hasRealConfigValue(appId) || !hasRealConfigValue(appKey)) {
    return [];
  }

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/in/search/${page}`);
  url.searchParams.set("app_id", appId!);
  url.searchParams.set("app_key", appKey!);
  url.searchParams.set("results_per_page", "20");
  url.searchParams.set("what", what);
  url.searchParams.set("content-type", "application/json");
  url.searchParams.set("sort_by", "date");
  if (where) url.searchParams.set("where", where);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobConnect India/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Adzuna request failed with ${response.status}`);
  }

  const data = (await response.json()) as AdzunaSearchResponse;
  return (data.results ?? []).map(normalizeAdzunaOpportunity);
}

async function fetchTheMusePage(page: number, location: string) {
  const url = new URL("https://www.themuse.com/api/public/jobs");
  url.searchParams.set("page", String(page));
  url.searchParams.set("location", location);
  if (process.env.THE_MUSE_API_KEY) {
    url.searchParams.set("api_key", process.env.THE_MUSE_API_KEY);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobConnect India/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`The Muse request failed with ${response.status}`);
  }

  const data = (await response.json()) as TheMuseResponse;
  return (data.results ?? [])
    .map(normalizeTheMuseOpportunity)
    .filter(Boolean) as Opportunity[];
}

async function fetchRemotiveIndia(searchTerm: string) {
  const url = new URL("https://remotive.com/api/remote-jobs");
  url.searchParams.set("search", searchTerm);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobConnect India/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Remotive request failed with ${response.status}`);
  }

  const data = (await response.json()) as RemotiveResponse;
  return (data.jobs ?? [])
    .map(normalizeRemotiveOpportunity)
    .filter(Boolean) as Opportunity[];
}

async function fetchJobicyFeed(keyword: string) {
  const url = new URL("https://jobicy.com/feed/job_feed");
  url.searchParams.set("search_region", "apac");
  url.searchParams.set("search_keywords", keyword);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobConnect India/1.0",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Jobicy request failed with ${response.status}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });
  const parsed = parser.parse(xml) as {
    rss?: {
      channel?: {
        item?: JobicyItem | JobicyItem[];
      };
    };
  };

  const items = parsed.rss?.channel?.item;
  const normalizedItems = Array.isArray(items) ? items : items ? [items] : [];

  return normalizedItems
    .map((item) => normalizeJobicyOpportunity(item, keyword))
    .filter(Boolean) as Opportunity[];
}

function dedupeOpportunities(items: Opportunity[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.company}-${item.title}-${item.officialApplyUrl}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDashboardStats(opportunities: Opportunity[]): DashboardStats {
  const topTags = Object.entries(
    opportunities.reduce<Record<string, number>>((acc, opportunity) => {
      for (const tag of opportunity.tags.slice(0, 5)) {
        acc[tag] = (acc[tag] ?? 0) + 1;
      }
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, count]) => ({ tag, count }));

  const startupCompanies = Object.values(
    opportunities.reduce<
      Record<string, { company: string; openings: number; averageStartupScore: number; total: number }>
    >((acc, opportunity) => {
      if (!opportunity.startup) return acc;
      const current = acc[opportunity.company] ?? {
        company: opportunity.company,
        openings: 0,
        averageStartupScore: 0,
        total: 0,
      };
      current.openings += 1;
      current.total += opportunity.startupScore;
      current.averageStartupScore = Math.round(current.total / current.openings);
      acc[opportunity.company] = current;
      return acc;
    }, {}),
  )
    .map(({ total, ...rest }) => rest)
    .sort((a, b) => b.averageStartupScore - a.averageStartupScore)
    .slice(0, 6);

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

async function saveSyncRun(status: string, fetchedCount: number, insertedCount: number, notes?: string) {
  if (db && isDatabaseConfigured) {
    await db.insert(syncRuns).values({
      id: nanoid(),
      source: "india-aggregator",
      status,
      fetchedCount,
      insertedCount,
      notes,
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
    "frontend engineer india",
  ];

  try {
    const museResults = (
      await Promise.all(
        INDIAN_CITIES.flatMap((location) => [
          fetchTheMusePage(1, location).catch(() => []),
          fetchTheMusePage(2, location).catch(() => []),
        ]),
      )
    ).flat();

    const remotiveResults = (
      await Promise.all(remotiveQueries.map((query) => fetchRemotiveIndia(query).catch(() => [])))
    ).flat();

    const jobicyResults = (
      await Promise.all(JOBICY_KEYWORDS.map((keyword) => fetchJobicyFeed(keyword).catch(() => [])))
    ).flat();

    const adzunaResults =
      hasRealConfigValue(process.env.ADZUNA_APP_ID) &&
      hasRealConfigValue(process.env.ADZUNA_APP_KEY)
      ? (
          await Promise.all(
            ["software engineer", "internship", "research engineer", "data analyst"].flatMap(
              (query) => [
                fetchAdzunaPage(1, query).catch(() => []),
                fetchAdzunaPage(2, query).catch(() => []),
              ],
            ),
          )
        ).flat()
      : [];

    const opportunities = dedupeOpportunities([
      ...museResults,
      ...remotiveResults,
      ...jobicyResults,
      ...adzunaResults,
    ]);

    return {
      opportunities,
      fetchedCount:
        museResults.length + remotiveResults.length + jobicyResults.length + adzunaResults.length,
    };
  } catch (error) {
    throw error;
  }
}

async function collectFastIndiaFallback() {
  const museResults = (
    await Promise.all([
      fetchTheMusePage(1, "Chennai, India").catch(() => []),
      fetchTheMusePage(1, "Bengaluru, India").catch(() => []),
      fetchTheMusePage(1, "Hyderabad, India").catch(() => []),
    ])
  ).flat();

  const remotiveResults = (
    await Promise.all([
      fetchRemotiveIndia("india").catch(() => []),
      fetchRemotiveIndia("internship india").catch(() => []),
    ])
  ).flat();

  const jobicyResults = (
    await Promise.all([
      fetchJobicyFeed("india").catch(() => []),
      fetchJobicyFeed("bangalore").catch(() => []),
    ])
  ).flat();

  return dedupeOpportunities([
    ...museResults,
    ...remotiveResults,
    ...jobicyResults,
  ]).slice(0, 60);
}

export async function syncIndiaOpportunities() {
  try {
    const { opportunities, fetchedCount } = await collectLiveIndiaOpportunities();

    if (db && isDatabaseConfigured) {
      for (const opportunity of opportunities) {
        await db
          .insert(jobs)
          .values({
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
            lastSyncedAt: new Date(),
          })
          .onConflictDoUpdate({
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
              lastSyncedAt: new Date(),
            },
          });
      }

      const opportunityIds = opportunities.map((item) => item.id);
      if (opportunityIds.length > 0) {
        await db
          .update(jobs)
          .set({
            isActive: false,
          })
          .where(eq(jobs.isActive, true));

        await db
          .update(jobs)
          .set({
            isActive: true,
          })
          .where(inArray(jobs.id, opportunityIds));
      }

      await saveSyncRun(
        "success",
        fetchedCount,
        opportunities.length,
      );
    } else {
      memoryStore.opportunities = opportunities;
      memoryStore.lastSyncAt = new Date();
    }

    return opportunities.length;
  } catch (error) {
    await saveSyncRun(
      "failed",
      0,
      0,
      error instanceof Error ? error.message : "Unknown sync error",
    );
    throw error;
  }
}

function filterOpportunities(opportunities: Opportunity[], query: FeedQuery) {
  return opportunities.filter((opportunity) => {
    if (query.track && query.track !== "all" && opportunity.track !== query.track) {
      return false;
    }

    if (query.startupsOnly && !opportunity.startup) {
      return false;
    }

    if (
      query.search &&
      ![
        opportunity.title,
        opportunity.company,
        opportunity.summary,
        opportunity.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.search.toLowerCase())
    ) {
      return false;
    }

    if (
      query.location &&
      !opportunity.location.toLowerCase().includes(query.location.toLowerCase())
    ) {
      return false;
    }

    return true;
  });
}

async function getStoredOpportunities() {
  if (db && isDatabaseConfigured) {
    const rows = await db.select().from(jobs).where(eq(jobs.isActive, true)).orderBy(desc(jobs.postedAt));
    return rows.map<Opportunity>((row) => ({
      id: row.id,
      title: row.title,
      company: row.companyName,
      location: row.location,
      summary: row.summary,
      employmentType: row.employmentType,
      track: row.track as Opportunity["track"],
      tags: (row.tags as string[]) ?? [],
      compensation: row.compensation ?? undefined,
      remote: row.remote,
      country: "India",
      state: row.state ?? undefined,
      city: row.city ?? undefined,
      visaSponsorship: row.visaSponsorship,
      startup: row.startup,
      startupScore: row.startupScore,
      source: row.source as Opportunity["source"],
      sourceLabel: row.sourceLabel,
      sourceUrl: row.sourceUrl,
      officialApplyUrl: row.officialApplyUrl,
      applyDomain: row.applyDomain ?? undefined,
      postedAt: row.postedAt?.toISOString(),
      researchDomain: row.researchDomain ?? undefined,
    }));
  }

  return memoryStore.opportunities;
}

async function getLastSyncDate() {
  if (db && isDatabaseConfigured) {
    const latest = await db.query.syncRuns.findFirst({
      orderBy: desc(syncRuns.createdAt),
    });
    return latest?.createdAt ?? null;
  }

  return memoryStore.lastSyncAt;
}

export async function getIndiaOpportunities(query: FeedQuery) {
  const ai = await getOllamaSearchExpansions(query.search ?? "");

  const lastSync = await getLastSyncDate();
  const needsSync =
    !lastSync || Date.now() - new Date(lastSync).getTime() > 1000 * 60 * 60 * 6;

  if (needsSync) {
    try {
      await syncIndiaOpportunities();
    } catch {
      // Keep serving the last known dataset if sync fails.
    }
  }

  let opportunities = await getStoredOpportunities();
  if (opportunities.length === 0) {
    try {
      opportunities = await collectFastIndiaFallback();
    } catch {
      // If live fallback fails too, return the empty state cleanly.
    }
  }

  const searchTerms = [query.search, ...(ai.expansions ?? [])].filter(Boolean) as string[];

  if (searchTerms.length > 1) {
    opportunities = opportunities.filter((opportunity) =>
      searchTerms.some((term) =>
        [opportunity.title, opportunity.company, opportunity.summary, opportunity.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(term.toLowerCase()),
      ),
    );
  }

  opportunities = filterOpportunities(opportunities, query).sort((a, b) => {
    if (query.startupsOnly) return b.startupScore - a.startupScore;
    return new Date(b.postedAt ?? 0).getTime() - new Date(a.postedAt ?? 0).getTime();
  });

  return {
    fetchedAt: new Date().toISOString(),
    query,
    ai,
    stats: buildDashboardStats(opportunities),
    opportunities,
  };
}
