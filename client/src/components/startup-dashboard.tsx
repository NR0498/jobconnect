import type { OpportunitiesResponse } from "@shared/schema";
import { Activity, Building2, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function StartupDashboard({
  stats,
}: {
  stats: OpportunitiesResponse["stats"];
}) {
  return (
    <section id="startup-dashboard" className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-primary">Startup dashboard</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            High-signal startup activity at a glance
          </h2>
        </div>
        <Badge className="border-primary/20 bg-primary/10 text-primary">
          {stats.startups} startup openings
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Trending startup tags</CardTitle>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {stats.topTags.map((tag) => (
              <div
                key={tag.tag}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="text-sm font-medium">{tag.tag}</p>
                <p className="text-xs text-muted-foreground">{tag.count} mentions</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Market shape</CardTitle>
          </div>
          <div className="mt-5 space-y-4">
            {[
              { label: "Remote-friendly", value: stats.remoteFriendly },
              { label: "Visa sponsorship", value: stats.visaSponsorship },
              { label: "Research crossover", value: stats.research },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-primary to-sky-400"
                    style={{
                      width: `${Math.min((item.value / Math.max(stats.total, 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.startupCompanies.map((company) => (
          <Card key={company.company}>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>{company.company}</CardTitle>
            </div>
            <CardDescription className="mt-3">
              {company.openings} live opening{company.openings > 1 ? "s" : ""} with an
              average startup score of {company.averageStartupScore}.
            </CardDescription>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Fast-moving opportunity cluster
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
