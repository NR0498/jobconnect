import type { Track } from "@shared/schema";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabButton, Tabs } from "@/components/ui/tabs";

type FilterBarProps = {
  search: string;
  location: string;
  track: Track;
  startupsOnly: boolean;
  onSearchChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onTrackChange: (value: Track) => void;
  onStartupToggle: () => void;
};

export function FilterBar(props: FilterBarProps) {
  return (
    <div className="space-y-4 rounded-[30px] border border-white/10 bg-card/80 p-5 backdrop-blur-xl">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder="Search roles, skills, domains, or companies"
            className="pl-11"
          />
        </div>
        <Input
          value={props.location}
          onChange={(event) => props.onLocationChange(event.target.value)}
          placeholder="Filter by city, country, or remote"
        />
        <Button variant={props.startupsOnly ? "default" : "outline"} onClick={props.onStartupToggle}>
          {props.startupsOnly ? "Showing startups" : "Startups only"}
        </Button>
      </div>

      <Tabs>
        {[
          { value: "all", label: "All" },
          { value: "internship", label: "Internships" },
          { value: "full-time", label: "Full-time" },
          { value: "research", label: "Research" },
        ].map((item) => (
          <TabButton
            key={item.value}
            active={props.track === item.value}
            onClick={() => props.onTrackChange(item.value as Track)}
          >
            {item.label}
          </TabButton>
        ))}
      </Tabs>
    </div>
  );
}
