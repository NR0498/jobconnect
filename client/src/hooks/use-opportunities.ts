import { useQuery } from "@tanstack/react-query";
import type { OpportunitiesResponse, Track } from "@shared/schema";

type OpportunityQuery = {
  search: string;
  location: string;
  track: Track;
  startupsOnly: boolean;
};

function buildQueryString(query: OpportunityQuery) {
  const params = new URLSearchParams();

  if (query.search.trim()) {
    params.set("search", query.search.trim());
  }

  if (query.location.trim()) {
    params.set("location", query.location.trim());
  }

  if (query.track && query.track !== "all") {
    params.set("track", query.track);
  }

  if (query.startupsOnly) {
    params.set("startupsOnly", "true");
  }

  return params.toString();
}

export function useOpportunities(query: OpportunityQuery) {
  return useQuery({
    queryKey: ["opportunities", query],
    queryFn: async () => {
      const params = buildQueryString(query);
      const response = await fetch(`/api/opportunities${params ? `?${params}` : ""}`);

      if (!response.ok) {
        throw new Error("Failed to load opportunities");
      }

      return (await response.json()) as OpportunitiesResponse;
    },
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard");

      if (!response.ok) {
        throw new Error("Failed to load dashboard");
      }

      return (await response.json()) as {
        fetchedAt: string;
        ai: {
          enabled: boolean;
          model?: string;
          notes?: string;
          expansions?: string[];
        };
        stats: OpportunitiesResponse["stats"];
        featuredStartups: OpportunitiesResponse["opportunities"];
        featuredResearch: OpportunitiesResponse["opportunities"];
      };
    },
  });
}
