import { notFound } from 'next/navigation';
import { AchievementEmbed } from '@/app/features/Achievement/components/AchievementEmbed';

// Embed page for iframes - lightweight version
export default async function AchievementEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ compact?: string }>;
}) {
  const { code } = await params;
  const { compact } = await searchParams;

  if (!code) {
    notFound();
  }

  // In a real implementation, fetch the shared achievement from database
  const mockAchievement = {
    id: 'mock-achievement',
    slug: 'first-ranking',
    title: 'First Ranking',
    description: 'Complete your first ranking to earn this achievement',
    category: 'curator' as const,
    tier: 'bronze' as const,
    icon: 'Trophy',
    points: 100,
    rarity: 75,
    unlocked: true,
    unlockedAt: new Date().toISOString(),
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareUrl = `${baseUrl}/achievement/${code}`;
  const isCompact = compact === 'true';

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{mockAchievement.title} - G.O.A.T. Achievement</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            background: transparent;
            min-height: ${isCompact ? 'auto' : '100%'};
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: ${isCompact ? '8px' : '16px'};
          }
        `}</style>
      </head>
      <body>
        <AchievementEmbed
          achievement={mockAchievement}
          username="Demo User"
          shareUrl={shareUrl}
          compact={isCompact}
        />
      </body>
    </html>
  );
}
