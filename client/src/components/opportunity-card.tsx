import type { Opportunity } from "@shared/schema";
import {
  ArrowUpRight,
  Building2,
  Globe2,
  MapPin,
  Rocket,
  ScrollText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils";

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>{opportunity.track}</Badge>
              {opportunity.remote ? <Badge>Remote</Badge> : null}
              {opportunity.visaSponsorship ? <Badge>Visa support</Badge> : null}
              {opportunity.startup ? (
                <Badge className="border-primary/25 bg-primary/10 text-primary">
                  Startup score {opportunity.startupScore}
                </Badge>
              ) : null}
            </div>
            <div>
              <CardTitle className="text-xl">{opportunity.title}</CardTitle>
              <CardDescription className="mt-2 flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {opportunity.company}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {opportunity.location}
                </span>
                <span className="inline-flex items-center gap-2">
                  <ScrollText className="h-4 w-4" />
                  {opportunity.employmentType}
                </span>
              </CardDescription>
            </div>
          </div>

          <div className="text-right">
            {opportunity.compensation ? (
              <p className="text-sm font-medium text-foreground">{opportunity.compensation}</p>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">
              {formatRelativeDate(opportunity.postedAt)}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          {opportunity.summary}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {opportunity.tags.slice(0, 6).map((tag) => (
            <Badge key={tag} className="bg-white/5">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          {opportunity.startup ? <Rocket className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
          {opportunity.source}
        </div>

        <a href={opportunity.sourceUrl} target="_blank" rel="noreferrer">
          <Button size="sm">
            Apply on source page
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </Card>
  );
}
