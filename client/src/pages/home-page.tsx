import { useMemo, useState } from "react";
import type { Track } from "@shared/schema";
import { FilterBar } from "@/components/filter-bar";
import { Hero } from "@/components/hero";
import { OpportunityCard } from "@/components/opportunity-card";
import { StartupDashboard } from "@/components/startup-dashboard";
import { StatsStrip } from "@/components/stats-strip";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useOpportunities } from "@/hooks/use-opportunities";

type PageKind = "all" | "startups" | "internships" | "research";
const RESEARCH_DOMAINS = [
  "AI & Robotics",
  "Life Sciences",
  "Climate & Energy",
  "Physical Sciences",
  "Social Sciences",
  "Computing & Engineering",
];

const pageCopy: Record<PageKind, {
  eyebrow: string;
  title: string;
  description: string;
  sectionTitle: string;
}> = {
  all: {
    eyebrow: "All India opportunities",
    title: "One feed for internships, established companies, startups, and research careers.",
    description: "Browse every active listing from all connected job sources, then narrow it by track, location, or company type.",
    sectionTitle: "All live openings across India",
  },
  startups: {
    eyebrow: "Startup opportunities",
    title: "Find early-stage and high-growth startup roles across India.",
    description: "Startup signals are calculated from company and listing data, then ranked to surface founding, seed, venture, and growth-stage roles.",
    sectionTitle: "Startup openings",
  },
  internships: {
    eyebrow: "Internships and early careers",
    title: "Launch your career with internships, trainee roles, and apprenticeships.",
    description: "A focused feed for students and early-career applicants across engineering, product, analytics, design, research, and business.",
    sectionTitle: "Internship and trainee openings",
  },
  research: {
    eyebrow: "Research careers",
    title: "Explore research roles by scientific and technical domain.",
    description: "Find research assistants, scientists, fellows, labs, and doctoral opportunities categorized by their research field.",
    sectionTitle: "Research opportunities",
  },
};

export function HomePage({ page = "all" }: { page?: PageKind }) {
  const fixedTrack: Track = page === "internships"
    ? "internship"
    : page === "research"
      ? "research"
      : "all";
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [track, setTrack] = useState<Track>(fixedTrack);
  const [startupToggle, setStartupToggle] = useState(page === "startups");
  const [companyType, setCompanyType] = useState<"startup" | "large-company" | undefined>(
    page === "startups" ? "startup" : undefined,
  );
  const [researchDomain, setResearchDomain] = useState<string>();

  const opportunitiesQuery = useOpportunities({
    search,
    location,
    track,
    startupsOnly: startupToggle,
    companyType,
    researchDomain,
  });
  const copy = pageCopy[page];

  const emptyStateCopy = useMemo(() => {
    if (page === "internships") return "Try software, analyst, design, product, trainee, or apprentice.";
    if (page === "research") return "Try AI, robotics, life sciences, climate, physics, policy, or engineering.";
    return "Try clearing one filter or searching a wider location.";
  }, [page]);

  return (
    <div className="space-y-8">
      <Hero eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      {opportunitiesQuery.data ? <StatsStrip stats={opportunitiesQuery.data.stats} /> : null}
      {page === "startups" && opportunitiesQuery.data ? (
        <StartupDashboard stats={opportunitiesQuery.data.stats} />
      ) : null}

      <section id="opportunities-section" className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-primary">Opportunity explorer</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{copy.sectionTitle}</h2>
          </div>
          {opportunitiesQuery.data?.ai ? (
            <Card className="max-w-md p-4">
              <CardTitle className="text-sm">Search intelligence</CardTitle>
              <CardDescription className="mt-2">
                {opportunitiesQuery.data.ai.notes}
              </CardDescription>
            </Card>
          ) : null}
        </div>

        {page === "all" ? (
          <div className="flex flex-wrap gap-2">
            <Button variant={!companyType ? "default" : "outline"} onClick={() => setCompanyType(undefined)}>All companies</Button>
            <Button variant={companyType === "large-company" ? "default" : "outline"} onClick={() => setCompanyType("large-company")}>Large companies</Button>
            <Button variant={companyType === "startup" ? "default" : "outline"} onClick={() => setCompanyType("startup")}>Startups</Button>
          </div>
        ) : null}

        {page === "research" ? (
          <div className="flex flex-wrap gap-2">
            <Button variant={!researchDomain ? "default" : "outline"} onClick={() => setResearchDomain(undefined)}>All research</Button>
            {RESEARCH_DOMAINS.map((domain) => (
              <Button
                key={domain}
                variant={researchDomain === domain ? "default" : "outline"}
                onClick={() => setResearchDomain(domain)}
              >
                {domain}
              </Button>
            ))}
          </div>
        ) : null}

        <FilterBar
          search={search}
          location={location}
          track={track}
          startupsOnly={startupToggle}
          onSearchChange={setSearch}
          onLocationChange={setLocation}
          onTrackChange={setTrack}
          onStartupToggle={() => setStartupToggle((current) => !current)}
          showTrackTabs={page === "all"}
          showStartupToggle={page === "all"}
        />

        {opportunitiesQuery.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-72 animate-pulse rounded-[28px] border border-white/10 bg-white/5" />
            ))}
          </div>
        ) : null}

        {opportunitiesQuery.isError ? (
          <Card>
            <CardTitle>We could not load openings right now.</CardTitle>
            <CardDescription className="mt-3">The API or live synchronization is temporarily unavailable.</CardDescription>
          </Card>
        ) : null}

        {opportunitiesQuery.data ? (
          <Card className="border-primary/15 bg-primary/5">
            <CardDescription>
              Showing {opportunitiesQuery.data.opportunities.length} openings from{" "}
              {Object.entries(opportunitiesQuery.data.sourceCounts)
                .map(([source, count]) => `${source}: ${count}`)
                .join(", ") || "the connected sources"}.
            </CardDescription>
          </Card>
        ) : null}

        {opportunitiesQuery.data?.opportunities.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {opportunitiesQuery.data.opportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        ) : null}

        {opportunitiesQuery.data && !opportunitiesQuery.data.opportunities.length ? (
          <Card>
            <CardTitle>No openings matched this combination.</CardTitle>
            <CardDescription className="mt-3">{emptyStateCopy}</CardDescription>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
