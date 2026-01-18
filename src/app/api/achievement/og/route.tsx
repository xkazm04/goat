import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Tier configurations for styling
const TIER_STYLES = {
  bronze: {
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)',
    glow: '#CD7F32',
    textColor: '#000',
  },
  silver: {
    gradient: 'linear-gradient(135deg, #E8E8E8 0%, #A8A8A8 100%)',
    glow: '#C0C0C0',
    textColor: '#000',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    glow: '#FFD700',
    textColor: '#000',
  },
  platinum: {
    gradient: 'linear-gradient(135deg, #E5E4E2 0%, #8FD8D8 100%)',
    glow: '#E5E4E2',
    textColor: '#000',
  },
  diamond: {
    gradient: 'linear-gradient(135deg, #B9F2FF 0%, #89CFF0 50%, #A7C7E7 100%)',
    glow: '#B9F2FF',
    textColor: '#000',
  },
};

// GET /api/achievement/og - Generate OG image for achievement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const title = searchParams.get('title') || 'Achievement Unlocked!';
    const description = searchParams.get('description') || 'Complete this achievement';
    const tier = (searchParams.get('tier') || 'gold') as keyof typeof TIER_STYLES;
    const points = searchParams.get('points') || '100';
    const rarity = searchParams.get('rarity') || '50';
    const username = searchParams.get('username');

    const tierStyle = TIER_STYLES[tier] || TIER_STYLES.gold;

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f1423 0%, #141c30 50%, #0f1423 100%)',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Background glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${tierStyle.glow}30 0%, transparent 70%)`,
              filter: 'blur(60px)',
            }}
          />

          {/* Card container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 48,
              borderRadius: 32,
              background: 'rgba(255, 255, 255, 0.03)',
              border: `2px solid ${tierStyle.glow}40`,
              boxShadow: `0 0 80px ${tierStyle.glow}20`,
              maxWidth: 600,
            }}
          >
            {/* Trophy icon container */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 24,
                background: tierStyle.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                boxShadow: `0 0 40px ${tierStyle.glow}60`,
              }}
            >
              {/* Trophy SVG */}
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke={tierStyle.textColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>

            {/* Achievement unlocked label */}
            <div
              style={{
                color: '#22d3ee',
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Achievement Unlocked
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: '#ffffff',
                textAlign: 'center',
                marginBottom: 12,
                textShadow: `0 0 30px ${tierStyle.glow}40`,
              }}
            >
              {title}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: 18,
                color: '#94a3b8',
                textAlign: 'center',
                marginBottom: 24,
                maxWidth: 400,
              }}
            >
              {description}
            </div>

            {/* Stats row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 32,
                padding: '16px 24px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 16,
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Tier badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: tierStyle.gradient,
                    fontSize: 14,
                    fontWeight: 700,
                    color: tierStyle.textColor,
                    textTransform: 'uppercase',
                  }}
                >
                  {tier}
                </div>
              </div>

              {/* Points */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={tierStyle.glow}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span style={{ color: '#ffffff', fontSize: 16, fontWeight: 600 }}>
                  {points} pts
                </span>
              </div>

              {/* Rarity */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ color: '#94a3b8', fontSize: 14 }}>Rarity:</span>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: `${tierStyle.glow}20`,
                    color: tierStyle.glow,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {rarity}%
                </span>
              </div>
            </div>

            {/* Username (if provided) */}
            {username && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 24,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#000',
                  }}
                >
                  {username.charAt(0).toUpperCase()}
                </div>
                <span style={{ color: '#94a3b8', fontSize: 16 }}>
                  {username}
                </span>
              </div>
            )}
          </div>

          {/* Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              G.O.A.T.
            </div>
            <div style={{ color: '#64748b', fontSize: 14 }}>
              Greatest Of All Time
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
