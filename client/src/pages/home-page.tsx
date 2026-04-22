import { useMemo, useState } from "react";
import type { Track } from "@shared/schema";
import { FilterBar } from "@/components/filter-bar";
import { Hero } from "@/components/hero";
import { OpportunityCard } from "@/components/opportunity-card";
import { StartupDashboard } from "@/components/startup-dashboard";
import { StatsStrip } from "@/components/stats-strip";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useDashboard, useOpportunities } from "@/hooks/use-opportunities";

export function HomePage({
  initialTrack = "all",
  startupsOnly = false,
}: {
  initialTrack?: Track;
  startupsOnly?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [track, setTrack] = useState<Track>(initialTrack);
  const [startupToggle, setStartupToggle] = useState(startupsOnly);

  const dashboardQuery = useDashboard();
  const opportunitiesQuery = useOpportunities({
    search,
    location,
    track,
    startupsOnly: startupToggle,
  });

  const emptyStateCopy = useMemo(() => {
    if (track === "internship") {
      return "Try broader keywords like software, analyst, design, or product.";
    }

    if (track === "research") {
      return "Try fields like ML, robotics, AI safety, biotech, or PhD.";
    }

    return "Try clearing one of the filters or searching a wider location.";
  }, [track]);

  return (
    <div className="space-y-8">
      <Hero />

      {dashboardQuery.data ? <StatsStrip stats={dashboardQuery.data.stats} /> : null}

      {dashboardQuery.data ? (
        <StartupDashboard stats={dashboardQuery.data.stats} />
      ) : null}

      <section id="opportunities-section" className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-primary">
              Opportunity explorer
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Live openings across India, segmented by career path
            </h2>
          </div>
          {opportunitiesQuery.data?.ai ? (
            <Card className="max-w-md p-4">
              <CardTitle className="text-sm">Search intelligence</CardTitle>
              <CardDescription className="mt-2">
                {opportunitiesQuery.data.ai.enabled
                  ? `Ollama expanded this search using ${opportunitiesQuery.data.ai.model}.`
                  : opportunitiesQuery.data.ai.notes}
              </CardDescription>
            </Card>
          ) : null}
        </div>

        <FilterBar
          search={search}
          location={location}
          track={track}
          startupsOnly={startupToggle}
          onSearchChange={setSearch}
          onLocationChange={setLocation}
          onTrackChange={setTrack}
          onStartupToggle={() => setStartupToggle((current) => !current)}
        />

        {opportunitiesQuery.isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-72 animate-pulse rounded-[28px] border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : null}

        {opportunitiesQuery.isError ? (
          <Card>
            <CardTitle>We could not load openings right now.</CardTitle>
            <CardDescription className="mt-3">
              The platform keeps an India fallback dataset, but the live sync may be
              temporarily unavailable.
            </CardDescription>
          </Card>
        ) : null}

        <Card className="border-primary/15 bg-primary/5">
          <CardDescription>
            India opportunities are synced into the database automatically. Apply links
            open the source listing so you can continue the application on the external page.
          </CardDescription>
        </Card>

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
