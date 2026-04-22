import { Sparkles, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.25),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.86),_rgba(76,29,149,0.55))] px-6 py-10 text-white shadow-[0_30px_100px_-40px_rgba(76,29,149,0.75)] sm:px-10">
      <div className="max-w-3xl">
        <Badge className="border-white/15 bg-white/10 text-white">
          Live job intelligence
        </Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          One board for full-time roles, internships, research, and fast-moving startup openings.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
          JobConnect keeps the professional job-board experience from the original brief,
          now backed by live API-fed opportunities and an optional Ollama-assisted search layer.
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
            title: "Live feeds",
            description: "Remotive and Arbeitnow refresh openings through the server.",
          },
          {
            title: "Segmented tracks",
            description: "Dedicated views for interns, full-time candidates, and researchers.",
          },
          {
            title: "Optional local AI",
            description: "Ollama can expand search terms when a local model is available.",
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
