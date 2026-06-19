import { Sparkles, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Hero({
  eyebrow = "India opportunities intelligence",
  title = "Discover Indian full-time jobs, internships, startup roles, and research opportunities from one connected platform.",
  description = "JobConnect combines live sources, database-backed listings, and direct application links for opportunities across India.",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.25),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.86),_rgba(76,29,149,0.55))] px-6 py-10 text-white shadow-[0_30px_100px_-40px_rgba(76,29,149,0.75)] sm:px-10">
      <div className="max-w-3xl">
        <Badge className="border-white/15 bg-white/10 text-white">
          {eyebrow}
        </Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            onClick={() =>
              document.getElementById("opportunities-section")?.scrollIntoView({
                behavior: "smooth",
              })
            }
          >
            <Zap className="h-4 w-4" />
            Explore Live Openings
          </Button>
          <Button
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            onClick={() =>
              document.getElementById("startup-dashboard")?.scrollIntoView({
                behavior: "smooth",
              })
            }
          >
            <TrendingUp className="h-4 w-4" />
            Startup Dashboard
          </Button>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "India-first feed",
            description: "The backend syncs India opportunities into the database automatically.",
          },
          {
            title: "Segmented tracks",
            description: "Browse internships, full-time jobs, startup openings, and research paths.",
          },
          {
            title: "Production search intelligence",
            description: "Related-role expansion works on Vercel, with optional Ollama enhancement.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Sparkles className="h-4 w-4" />
              {item.title}
            </div>
            <p className="mt-3 text-sm leading-6 text-white/75">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
