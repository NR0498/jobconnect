import { and, desc, eq, inArray } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import { nanoid } from "nanoid";
import type { DashboardStats, Opportunity, Track } from "../shared/schema.js";
import { jobs, syncRuns } from "../shared/schema.js";
import { db, isDatabaseConfigured } from "./db.js";
import { memoryStore } from "./memoryStore.js";
import { getOllamaSearchExpansions } from "./ollama.js";

type FeedQuery = {
  search?: string;
  location?: string;
  track?: Track;
  startupsOnly?: boolean;
  companyType?: "startup" | "large-company";
  researchDomain?: string;
};

type SourceReport = {
  counts: Record<string, number>;
  errors: Record<string, string[]>;
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

type EmployerBoard = {
  token: string;
  company: string;
};

type GreenhouseJob = {
  id: number;
  title: string;
  updated_at?: string;
  absolute_url: string;
  content?: string;
  company_name?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  offices?: Array<{ name?: string; location?: string }>;
};

type GreenhouseResponse = {
  jobs?: GreenhouseJob[];
};

type LeverJob = {
  id: string;
  text: string;
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
    department?: string;
    allLocations?: string[];
  };
  country?: string;
  descriptionPlain?: string;
  openingPlain?: string;
  additionalPlain?: string;
  hostedUrl: string;
  applyUrl?: string;
  workplaceType?: "unspecified" | "on-site" | "remote" | "hybrid";
  salaryDescriptionPlain?: string;
  createdAt?: number;
};

type AshbyJob = {
  id: string;
  title: string;
  location?: string;
  department?: string;
  team?: string;
  employmentType?: string;
  isRemote?: boolean;
  descriptionHtml?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  jobUrl: string;
  applyUrl?: string;
};

type AshbyResponse = {
  jobs?: AshbyJob[];
};

type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description?: string;
  remote?: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
};

type ArbeitnowResponse = {
  data?: ArbeitnowJob[];
  links?: { next?: string | null };
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

const LARGE_COMPANIES = [
  "amazon", "apple", "accenture", "adobe", "bank of america", "bechtel",
  "celonis", "cisco", "coca-cola", "deloitte", "doordash", "google", "ibm",
  "infosys", "intel", "jpmorgan", "microsoft", "oracle", "salesforce",
  "samsung", "tata consultancy", "tcs", "uber", "walmart", "wipro",
];

function parseEmployerBoards(value?: string) {
  if (!value?.trim()) return [] as EmployerBoard[];

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawToken, rawCompany] = entry.split("|");
      const token = rawToken.trim();
      const company = rawCompany?.trim() || token
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(" ");
      return { token, company };
    });
}

function getConfiguredEmployerBoards() {
  return {
    greenhouse: parseEmployerBoards(process.env.GREENHOUSE_BOARDS),
    lever: parseEmployerBoards(process.env.LEVER_SITES),
    ashby: parseEmployerBoards(process.env.ASHBY_BOARDS),
  };
}

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

function getCompanyType(company: string, startupScore: number): Opportunity["companyType"] {
  const normalized = company.toLowerCase();
  if (LARGE_COMPANIES.some((name) => normalized.includes(name))) {
    return "large-company";
  }
  return startupScore >= 50 ? "startup" : "other";
}

function inferResearchDomain(title: string, summary: string, tags: string[]) {
  const corpus = [title, summary, ...tags].join(" ").toLowerCase();
  if (/(machine learning|artificial intelligence|deep learning|computer vision|nlp|robotics)/.test(corpus)) return "AI & Robotics";
  if (/(bio|clinical|medical|pharma|genomics|health|neuro)/.test(corpus)) return "Life Sciences";
  if (/(climate|energy|environment|sustainability|earth)/.test(corpus)) return "Climate & Energy";
  if (/(physics|quantum|material|chemistry)/.test(corpus)) return "Physical Sciences";
  if (/(economics|policy|social science|psychology|education)/.test(corpus)) return "Social Sciences";
  return "Computing & Engineering";
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
    startup: getCompanyType(job.company?.display_name ?? "Unknown company", startupScore) === "startup",
    startupScore,
    companyType: getCompanyType(job.company?.display_name ?? "Unknown company", startupScore),
    source: "adzuna",
    sourceLabel: "Jobs by Adzuna",
    sourceUrl: job.redirect_url,
    officialApplyUrl: job.redirect_url,
    applyDomain: extractDomain(job.redirect_url),
    postedAt: job.created,
    researchDomain: inferTrack(job.title, summary) === "research"
      ? inferResearchDomain(job.title, summary, tags)
      : undefined,
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
    startup: getCompanyType(job.company?.name ?? "Unknown company", startupScore) === "startup",
    startupScore,
    companyType: getCompanyType(job.company?.name ?? "Unknown company", startupScore),
    source: "themuse",
    sourceLabel: "The Muse",
    sourceUrl: landingPage,
    officialApplyUrl: landingPage,
    applyDomain: extractDomain(landingPage),
    postedAt: job.publication_date,
    researchDomain: inferTrack(job.name, summary) === "research"
      ? inferResearchDomain(job.name, summary, tags)
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
    startup: getCompanyType(job.company_name, startupScore) === "startup",
    startupScore,
    companyType: getCompanyType(job.company_name, startupScore),
    source: "remotive",
    sourceLabel: "Remotive",
    sourceUrl: job.url,
    officialApplyUrl: job.url,
    applyDomain: extractDomain(job.url),
    postedAt: job.publication_date,
    researchDomain: inferTrack(job.title, summary) === "research"
      ? inferResearchDomain(job.title, summary, tags)
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
    startup: getCompanyType("Remote Company", startupScore) === "startup",
    startupScore,
    companyType: getCompanyType("Remote Company", startupScore),
    source: "jobicy",
    sourceLabel: "Jobicy",
    sourceUrl: link,
    officialApplyUrl: link,
    applyDomain: extractDomain(link),
    postedAt: job.pubDate ? new Date(job.pubDate).toISOString() : undefined,
    researchDomain: inferTrack(title, summary) === "research"
      ? inferResearchDomain(title, summary, tags)
      : undefined,
  };
}

function normalizeEmployerOpportunity(input: {
  id: string;
  title: string;
  company: string;
  location?: string;
  summary?: string;
  employmentType?: string;
  tags?: string[];
  remote?: boolean;
  source: "greenhouse" | "lever" | "ashby" | "arbeitnow";
  sourceLabel: string;
  sourceUrl: string;
  applyUrl?: string;
  postedAt?: string;
  compensation?: string;
}): Opportunity | null {
  const location = input.location?.trim() || "Location not specified";
  const summary = stripHtml(input.summary);
  const tags = [...new Set((input.tags ?? []).filter(Boolean))];
  const indiaRelevant =
    isIndiaLocation(location) ||
    (input.remote === true && isIndiaLocation(`${input.title} ${summary}`));

  if (!indiaRelevant) return null;

  const track = inferTrack(input.title, summary);
  const startupScore = getStartupScore({
    title: input.title,
    company: input.company,
    summary,
    tags,
  });
  const companyType = getCompanyType(input.company, startupScore);
  const parsedLocation = getStateAndCity(location);

  return {
    id: `${input.source}-${input.id}`,
    title: input.title,
    company: input.company,
    location,
    summary,
    employmentType: input.employmentType || "Not specified",
    track,
    tags,
    compensation: input.compensation,
    remote: input.remote === true || /remote|hybrid/i.test(location),
    country: "India",
    state: parsedLocation.state,
    city: parsedLocation.city,
    visaSponsorship: /visa|sponsor/i.test(summary),
    startup: companyType === "startup",
    startupScore,
    companyType,
    source: input.source,
    sourceLabel: input.sourceLabel,
    sourceUrl: input.sourceUrl,
    officialApplyUrl: input.applyUrl || input.sourceUrl,
    applyDomain: extractDomain(input.applyUrl || input.sourceUrl),
    postedAt: input.postedAt,
    researchDomain:
      track === "research"
        ? inferResearchDomain(input.title, summary, tags)
        : undefined,
  };
}

function normalizeGreenhouseOpportunity(job: GreenhouseJob, board: EmployerBoard) {
  const company = job.company_name?.trim() || board.company;
  const location =
    job.location?.name ||
    job.offices?.map((office) => office.location || office.name).filter(Boolean).join(", ") ||
    "Location not specified";
  const tags = (job.departments ?? []).map((department) => department.name).filter(Boolean) as string[];

  return normalizeEmployerOpportunity({
    id: `${board.token}-${job.id}`,
    title: job.title,
    company,
    location,
    summary: job.content,
    tags,
    source: "greenhouse",
    sourceLabel: `${company} via Greenhouse`,
    sourceUrl: job.absolute_url,
    postedAt: job.updated_at,
  });
}

function normalizeLeverOpportunity(job: LeverJob, board: EmployerBoard) {
  const location =
    job.categories?.allLocations?.join(", ") ||
    job.categories?.location ||
    "Location not specified";
  const tags = [
    job.categories?.team,
    job.categories?.department,
    job.categories?.commitment,
  ].filter(Boolean) as string[];

  return normalizeEmployerOpportunity({
    id: `${board.token}-${job.id}`,
    title: job.text,
    company: board.company,
    location,
    summary:
      job.descriptionPlain ||
      [job.openingPlain, job.additionalPlain].filter(Boolean).join(" "),
    employmentType: job.categories?.commitment,
    tags,
    remote: job.workplaceType === "remote",
    source: "lever",
    sourceLabel: `${board.company} via Lever`,
    sourceUrl: job.hostedUrl,
    applyUrl: job.applyUrl,
    postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
    compensation: job.salaryDescriptionPlain,
  });
}

function normalizeAshbyOpportunity(job: AshbyJob, board: EmployerBoard) {
  const tags = [job.department, job.team].filter(Boolean) as string[];
  return normalizeEmployerOpportunity({
    id: `${board.token}-${job.id}`,
    title: job.title,
    company: board.company,
    location: job.location,
    summary: job.descriptionPlain || job.descriptionHtml,
    employmentType: job.employmentType,
    tags,
    remote: job.isRemote,
    source: "ashby",
    sourceLabel: `${board.company} via Ashby`,
    sourceUrl: job.jobUrl,
    applyUrl: job.applyUrl,
    postedAt: job.publishedAt,
  });
}

function normalizeArbeitnowOpportunity(job: ArbeitnowJob) {
  return normalizeEmployerOpportunity({
    id: job.slug,
    title: job.title,
    company: job.company_name,
    location: job.location,
    summary: job.description,
    employmentType: job.job_types?.join(", "),
    tags: [...(job.tags ?? []), ...(job.job_types ?? [])],
    remote: job.remote,
    source: "arbeitnow",
    sourceLabel: "Arbeitnow",
    sourceUrl: job.url,
    postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : undefined,
  });
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
  if (what) url.searchParams.set("what", what);
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

async function fetchGreenhouseBoard(board: EmployerBoard) {
  const url = new URL(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.token)}/jobs`,
  );
  url.searchParams.set("content", "true");

  const response = await fetch(url, {
    headers: { "User-Agent": "JobConnect India/1.0" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Greenhouse ${board.token} failed with ${response.status}`);
  }

  const data = (await response.json()) as GreenhouseResponse;
  return (data.jobs ?? [])
    .map((job) => normalizeGreenhouseOpportunity(job, board))
    .filter(Boolean) as Opportunity[];
}

async function fetchLeverSite(board: EmployerBoard) {
  const url = new URL(
    `https://api.lever.co/v0/postings/${encodeURIComponent(board.token)}`,
  );
  url.searchParams.set("mode", "json");
  url.searchParams.set("limit", "200");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "JobConnect India/1.0",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Lever ${board.token} failed with ${response.status}`);
  }

  const jobs = (await response.json()) as LeverJob[];
  return jobs
    .map((job) => normalizeLeverOpportunity(job, board))
    .filter(Boolean) as Opportunity[];
}

async function fetchAshbyBoard(board: EmployerBoard) {
  const url = new URL(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.token)}`,
  );
  url.searchParams.set("includeCompensation", "true");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "JobConnect India/1.0",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Ashby ${board.token} failed with ${response.status}`);
  }

  const data = (await response.json()) as AshbyResponse;
  return (data.jobs ?? [])
    .map((job) => normalizeAshbyOpportunity(job, board))
    .filter(Boolean) as Opportunity[];
}

async function fetchArbeitnowPages(pageCount = 3) {
  const results: Opportunity[] = [];

  for (let page = 1; page <= pageCount; page += 1) {
    const url = new URL("https://www.arbeitnow.com/api/job-board-api");
    url.searchParams.set("page", String(page));
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "JobConnect India/1.0",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`Arbeitnow page ${page} failed with ${response.status}`);
    }

    const data = (await response.json()) as ArbeitnowResponse;
    results.push(
      ...(data.data ?? [])
        .map(normalizeArbeitnowOpportunity)
        .filter(Boolean) as Opportunity[],
    );
    if (!data.links?.next) break;
  }

  return results;
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
  const employerBoards = getConfiguredEmployerBoards();
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

  const report: SourceReport = { counts: {}, errors: {} };
  const collect = async (
    source: string,
    requests: Array<Promise<Opportunity[]>>,
  ) => {
    const settled = await Promise.allSettled(requests);
    const results = settled.flatMap((result) => {
      if (result.status === "fulfilled") return result.value;
      report.errors[source] ??= [];
      report.errors[source].push(
        result.reason instanceof Error ? result.reason.message : String(result.reason),
      );
      return [];
    });
    report.counts[source] = results.length;
    return results;
  };

  const musePromise = collect(
    "themuse",
    INDIAN_CITIES.flatMap((location) => [
      fetchTheMusePage(1, location),
      fetchTheMusePage(2, location),
    ]),
  );

  const remotivePromise = collect(
    "remotive",
    remotiveQueries.map((query) => fetchRemotiveIndia(query)),
  );

  const jobicyPromise = collect(
    "jobicy",
    JOBICY_KEYWORDS.map((keyword) => fetchJobicyFeed(keyword)),
  );

  const adzunaQueries = [
    "",
    "software engineer",
    "data analyst",
    "product manager",
    "internship",
    "research scientist",
    "startup",
    "founding engineer",
    "finance",
    "marketing",
  ];
  const adzunaPromise =
    hasRealConfigValue(process.env.ADZUNA_APP_ID) &&
    hasRealConfigValue(process.env.ADZUNA_APP_KEY)
      ? collect(
          "adzuna",
          adzunaQueries.flatMap((query) => [
            fetchAdzunaPage(1, query),
            fetchAdzunaPage(2, query),
          ]),
        )
      : Promise.resolve([] as Opportunity[]);

  const greenhousePromise = employerBoards.greenhouse.length
    ? collect(
        "greenhouse",
        employerBoards.greenhouse.map(fetchGreenhouseBoard),
      )
    : Promise.resolve([] as Opportunity[]);

  const leverPromise = employerBoards.lever.length
    ? collect("lever", employerBoards.lever.map(fetchLeverSite))
    : Promise.resolve([] as Opportunity[]);

  const ashbyPromise = employerBoards.ashby.length
    ? collect("ashby", employerBoards.ashby.map(fetchAshbyBoard))
    : Promise.resolve([] as Opportunity[]);

  const arbeitnowPromise = collect("arbeitnow", [fetchArbeitnowPages()]);

  const [
    museResults,
    remotiveResults,
    jobicyResults,
    adzunaResults,
    greenhouseResults,
    leverResults,
    ashbyResults,
    arbeitnowResults,
  ] = await Promise.all([
    musePromise,
    remotivePromise,
    jobicyPromise,
    adzunaPromise,
    greenhousePromise,
    leverPromise,
    ashbyPromise,
    arbeitnowPromise,
  ]);

  report.counts.adzuna ??= 0;
  report.counts.greenhouse ??= 0;
  report.counts.lever ??= 0;
  report.counts.ashby ??= 0;
  const opportunities = dedupeOpportunities([
    ...museResults,
    ...remotiveResults,
    ...jobicyResults,
    ...adzunaResults,
    ...greenhouseResults,
    ...leverResults,
    ...ashbyResults,
    ...arbeitnowResults,
  ]);

  return {
    opportunities,
    fetchedCount:
      museResults.length +
      remotiveResults.length +
      jobicyResults.length +
      adzunaResults.length +
      greenhouseResults.length +
      leverResults.length +
      ashbyResults.length +
      arbeitnowResults.length,
    report,
  };
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
    const { opportunities, fetchedCount, report } = await collectLiveIndiaOpportunities();

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

      for (const source of [
        "themuse",
        "remotive",
        "jobicy",
        "adzuna",
        "greenhouse",
        "lever",
        "ashby",
        "arbeitnow",
      ] as const) {
        const configuredBoards = getConfiguredEmployerBoards();
        if (
          (source === "greenhouse" && !configuredBoards.greenhouse.length) ||
          (source === "lever" && !configuredBoards.lever.length) ||
          (source === "ashby" && !configuredBoards.ashby.length)
        ) {
          continue;
        }
        if (report.errors[source]?.length) continue;
        const opportunityIds = opportunities
          .filter((item) => item.source === source)
          .map((item) => item.id);

        await db
          .update(jobs)
          .set({ isActive: false })
          .where(and(eq(jobs.isActive, true), eq(jobs.source, source)));

        if (opportunityIds.length) {
          await db
            .update(jobs)
            .set({ isActive: true })
            .where(inArray(jobs.id, opportunityIds));
        }
      }

      await saveSyncRun(
        "success",
        fetchedCount,
        opportunities.length,
        JSON.stringify(report),
      );
    } else {
      memoryStore.opportunities = opportunities;
      memoryStore.lastSyncAt = new Date();
    }

    return {
      total: opportunities.length,
      sources: report.counts,
      errors: report.errors,
    };
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

function filterOpportunities(
  opportunities: Opportunity[],
  query: FeedQuery,
  searchTerms: string[],
) {
  return opportunities.filter((opportunity) => {
    if (query.track && query.track !== "all" && opportunity.track !== query.track) {
      return false;
    }

    if (query.startupsOnly && !opportunity.startup) {
      return false;
    }

    if (query.companyType && opportunity.companyType !== query.companyType) {
      return false;
    }

    if (
      query.researchDomain &&
      opportunity.researchDomain !== query.researchDomain
    ) {
      return false;
    }

    if (
      searchTerms.length &&
      !searchTerms.some((term) =>
        [
          opportunity.title,
          opportunity.company,
          opportunity.summary,
          opportunity.tags.join(" "),
          opportunity.researchDomain ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(term.toLowerCase()),
      )
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
      startup: getCompanyType(row.companyName, row.startupScore) === "startup",
      startupScore: row.startupScore,
      companyType: getCompanyType(row.companyName, row.startupScore),
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

  opportunities = filterOpportunities(opportunities, query, searchTerms).sort((a, b) => {
    if (query.startupsOnly) return b.startupScore - a.startupScore;
    return new Date(b.postedAt ?? 0).getTime() - new Date(a.postedAt ?? 0).getTime();
  });

  return {
    fetchedAt: new Date().toISOString(),
    query,
    ai,
    stats: buildDashboardStats(opportunities),
    sourceCounts: opportunities.reduce<Record<string, number>>((counts, item) => {
      counts[item.source] = (counts[item.source] ?? 0) + 1;
      return counts;
    }, {}),
    researchDomains: Object.entries(
      opportunities.reduce<Record<string, number>>((counts, item) => {
        if (item.researchDomain) {
          counts[item.researchDomain] = (counts[item.researchDomain] ?? 0) + 1;
        }
        return counts;
      }, {}),
    )
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count),
    opportunities,
  };
}
