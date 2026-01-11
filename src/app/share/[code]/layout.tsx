import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

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
  const ogImageUrl = `${baseUrl}/api/share/og-image?code=${code}`;

  const title = `${ranking.title} | G.O.A.T.`;
  const description = `Check out this Top ${ranking.items?.length || 10} ${ranking.category} ranking: "${ranking.title}". Think you can do better? Challenge it now!`;

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
          alt: ranking.title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
      creator: "@goat_rankings",
    },
    other: {
      "og:image:type": "image/png",
    },
  };
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
