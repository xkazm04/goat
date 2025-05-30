import { MatchContainer } from "@/components/match/match-container";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Match Feature",
  description: "Match and rank items with this interactive feature",
};

export default function MatchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-4 mb-8">
        <h1 className="text-3xl font-bold">Match &amp; Rank</h1>
        <p className="text-muted-foreground">
          Rank items by dragging from the backlog into the grid or match them by clicking.
        </p>
      </div>
      <MatchContainer />
    </div>
  );
}