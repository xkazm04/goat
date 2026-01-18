import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AchievementCard } from '@/app/features/Achievement';

// Generate metadata for Open Graph sharing
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;

  // In a real implementation, fetch achievement data from database
  // For now, return default metadata
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ogImageUrl = `${baseUrl}/api/achievement/og?code=${code}`;

  return {
    title: 'Achievement Unlocked - G.O.A.T.',
    description: 'Check out this achievement on G.O.A.T. - Greatest Of All Time',
    openGraph: {
      title: 'Achievement Unlocked - G.O.A.T.',
      description: 'Check out this achievement on G.O.A.T. - Greatest Of All Time',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'G.O.A.T. Achievement',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Achievement Unlocked - G.O.A.T.',
      description: 'Check out this achievement on G.O.A.T.',
      images: [ogImageUrl],
    },
  };
}

// Main achievement page component
export default async function AchievementPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // In a real implementation, fetch the shared achievement from database
  // For now, use mock data
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

  if (!code) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Achievement card */}
        <AchievementCard
          achievement={mockAchievement}
          config={{
            style: 'default',
            showUsername: true,
            showProgress: false,
            showRarity: true,
            showDate: true,
            animated: true,
          }}
          username="Demo User"
        />

        {/* Call to action */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
            }}
          >
            Start Your Own Rankings
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>

          <p className="mt-4 text-sm text-gray-500">
            Create rankings, earn achievements, and share with friends
          </p>
        </div>

        {/* Branding */}
        <div className="mt-8 text-center">
          <div
            className="text-2xl font-extrabold inline-block"
            style={{
              background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            G.O.A.T.
          </div>
          <p className="text-xs text-gray-600 mt-1">Greatest Of All Time</p>
        </div>
      </div>
    </div>
  );
}
