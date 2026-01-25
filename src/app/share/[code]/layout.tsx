import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { OGCardLayout } from "@/lib/og/types";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}

async function getSharedRanking(code: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("shared_rankings")
    .select("*")
    .eq("share_code", code)
    .single();

  if (error) {
    console.error("Error fetching shared ranking:", error);
    return null;
  }

  return data;
}

// Determine the best layout based on items
function suggestLayout(items: Array<{ image_url?: string }>): OGCardLayout {
  const hasImages = items?.some(item => item.image_url);
  const itemCount = items?.length || 0;

  // Featured layout for short lists with images
  if (itemCount <= 3 && hasImages) {
    return 'featured';
  }

  // Grid layout for visual categories
  if (hasImages && itemCount >= 4) {
    return 'grid';
  }

  // Default list layout
  return 'list';
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { code } = await params;
  const ranking = await getSharedRanking(code);

  if (!ranking) {
    return {
      title: "Ranking Not Found | G.O.A.T.",
      description: "This ranking could not be found.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://goat.app";
  const shareUrl = `${baseUrl}/share/${code}`;

  // Determine the best layout for this content
  const layout = suggestLayout(ranking.items || []);

  // Generate OG image URLs with the new dynamic OG route
  const ogImageUrl = `${baseUrl}/api/og/${code}?layout=${layout}`;
  const twitterImageUrl = `${baseUrl}/api/og/${code}?layout=${layout}&platform=twitter`;

  const title = `${ranking.title} | G.O.A.T.`;

  // Generate rich description with top items
  const topItems = (ranking.items || []).slice(0, 3);
  const itemsText = topItems.map((item: { title: string }, i: number) => `${i + 1}. ${item.title}`).join(", ");
  const moreCount = (ranking.items?.length || 0) - 3;
  const description = moreCount > 0
    ? `Top ${ranking.items?.length || 10} ${ranking.category}: ${itemsText}... and ${moreCount} more. Think you can do better? Challenge it now!`
    : `Top ${ranking.items?.length || 10} ${ranking.category}: ${itemsText}. Think you can do better? Challenge it now!`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: shareUrl,
      siteName: "G.O.A.T. - Greatest Of All Time",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${ranking.title} - G.O.A.T. Ranking`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [twitterImageUrl],
      site: "@goat_rankings",
      creator: "@goat_rankings",
    },
    other: {
      "og:image:type": "image/png",
      "og:image:width": "1200",
      "og:image:height": "630",
      // Discord-specific metadata
      "theme-color": "#22d3ee",
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
