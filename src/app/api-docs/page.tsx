import { APIDocumentation } from "@/app/features/PublicAPI";

export const metadata = {
  title: "GOAT API Documentation - Universal Ranking API",
  description:
    "Access GOAT consensus rankings through our public API. The Rotten Tomatoes of everything - embed widgets, build integrations, and leverage community-driven rankings.",
  keywords: [
    "GOAT",
    "API",
    "rankings",
    "consensus",
    "ratings",
    "widgets",
    "embed",
    "integration",
  ],
  openGraph: {
    title: "GOAT API - Universal Ranking API",
    description: "The Rotten Tomatoes of everything. Access community rankings via API.",
    type: "website",
  },
};

export default function APIDocsPage() {
  return <APIDocumentation />;
}
