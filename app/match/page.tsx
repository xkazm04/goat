import { MatchContainer } from "@/app/features/Match/MatchContainer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Match Feature",
  description: "Match and rank items with this interactive feature",
};

export default function MatchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <MatchContainer />
    </div>
  );
}