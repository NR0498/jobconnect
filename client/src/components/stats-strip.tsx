import type { OpportunitiesResponse } from "@shared/schema";
import { Card } from "@/components/ui/card";

export function StatsStrip({
  stats,
}: {
  stats: OpportunitiesResponse["stats"];
}) {
  const items = [
    { label: "Total openings", value: stats.total },
    { label: "Internships", value: stats.internships },
    { label: "Full-time", value: stats.fullTime },
    { label: "Research", value: stats.research },
    { label: "Startups", value: stats.startups },
    { label: "Visa friendly", value: stats.visaSponsorship },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <Card key={item.label} className="p-5">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
        </Card>
      ))}
    </div>
  );
}
