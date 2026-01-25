/**
 * Dynamic OG Image Generation API
 * Generates Open Graph images for shared rankings with multiple layouts
 *
 * GET /api/og/[listId]?layout=list&platform=twitter
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  OGCardLayout,
  SocialPlatform,
  OGCardData,
  OGCardOptions,
  OGCardTheme,
} from '@/lib/og/types';
import {
  DEFAULT_THEME,
  VIBRANT_THEME,
  PLATFORM_DIMENSIONS,
  DEFAULT_OG_OPTIONS,
} from '@/lib/og/types';
import {
  getMedalColor,
  getMedalGradient,
  getMedalBorder,
  truncateText,
  hashData,
} from '@/lib/og/OGCardGenerator';
import { getOGCacheManager } from '@/lib/og/CacheManager';

export const runtime = 'edge';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Fetch shared ranking data from database
 */
async function getSharedRanking(shareCode: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('shared_rankings')
    .select('*')
    .eq('share_code', shareCode)
    .single();

  if (error) {
    console.error('Error fetching shared ranking:', error);
    return null;
  }

  return data;
}

/**
 * Parse options from URL query params
 */
function parseOptions(searchParams: URLSearchParams): OGCardOptions {
  const layout = (searchParams.get('layout') as OGCardLayout) || 'list';
  const platform = (searchParams.get('platform') as SocialPlatform) || 'default';
  const maxItems = parseInt(searchParams.get('maxItems') || '5', 10);
  const showImages = searchParams.get('showImages') !== 'false';
  const themeName = searchParams.get('theme') || 'default';

  let theme: OGCardTheme = DEFAULT_THEME;
  if (themeName === 'vibrant') {
    theme = VIBRANT_THEME;
  }

  return {
    ...DEFAULT_OG_OPTIONS,
    layout,
    platform,
    maxItems: Math.min(Math.max(maxItems, 1), 10),
    showImages,
    theme,
  };
}

/**
 * Convert database item to OG card item format
 */
function transformItems(items: Array<{ position: number; title: string; image_url?: string; description?: string }>) {
  return items.map(item => ({
    position: item.position,
    title: item.title,
    imageUrl: item.image_url,
    subtitle: item.description,
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId: shareCode } = await params;
    const searchParams = request.nextUrl.searchParams;
    const options = parseOptions(searchParams);

    if (!shareCode) {
      return new Response('Share code is required', { status: 400 });
    }

    // Fetch ranking data
    const ranking = await getSharedRanking(shareCode);

    if (!ranking) {
      return generateDefaultCard();
    }

    // Transform to OGCardData format
    const cardData: OGCardData = {
      title: ranking.title,
      category: ranking.category,
      subcategory: ranking.subcategory,
      timePeriod: ranking.time_period || 'All Time',
      items: transformItems(ranking.items || []),
      totalItems: ranking.items?.length || 0,
      viewCount: ranking.view_count,
      challengeCount: ranking.challenge_count,
      shareCode,
    };

    // Get dimensions for target platform
    const dimensions = PLATFORM_DIMENSIONS[options.platform];

    // Render the appropriate layout
    return new ImageResponse(
      renderOGCard(cardData, options),
      {
        width: dimensions.width,
        height: dimensions.height,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Error generating image', { status: 500 });
  }
}

/**
 * Generate default/fallback OG card
 */
function generateDefaultCard() {
  const theme = DEFAULT_THEME;

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
          background: theme.backgroundGradient,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 'bold',
            background: `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.secondaryAccent} 100%)`,
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 20,
          }}
        >
          G.O.A.T.
        </div>
        <div
          style={{
            fontSize: 32,
            color: theme.textSecondary,
          }}
        >
          Ranking not found
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

/**
 * Render OG card based on layout type
 */
function renderOGCard(data: OGCardData, options: OGCardOptions) {
  const theme = options.theme || DEFAULT_THEME;

  switch (options.layout) {
    case 'grid':
      return renderGridLayout(data, options, theme);
    case 'featured':
      return renderFeaturedLayout(data, options, theme);
    case 'list':
    default:
      return renderListLayout(data, options, theme);
  }
}

/**
 * List Layout - Default vertical list
 */
function renderListLayout(data: OGCardData, options: OGCardOptions, theme: OGCardTheme) {
  const maxItems = options.maxItems || 5;
  const topItems = data.items.slice(0, maxItems);
  const remainingCount = (data.totalItems || data.items.length) - topItems.length;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.backgroundGradient,
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: 48,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative elements */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          background: `radial-gradient(circle, ${theme.accentColor}26 0%, transparent 70%)`,
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          background: `radial-gradient(circle, ${theme.secondaryAccent}1a 0%, transparent 70%)`,
          borderRadius: '50%',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: `${theme.accentColor}33`,
                border: `1px solid ${theme.accentColor}4d`,
                borderRadius: 8,
                padding: '6px 16px',
                color: theme.accentColor,
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              {data.category}
              {data.subcategory && ` • ${data.subcategory}`}
            </div>
            {data.timePeriod && (
              <div
                style={{
                  background: `${theme.secondaryAccent}33`,
                  border: `1px solid ${theme.secondaryAccent}4d`,
                  borderRadius: 8,
                  padding: '6px 16px',
                  color: theme.secondaryAccent,
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                {data.timePeriod}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: theme.textPrimary,
              lineHeight: 1.2,
              maxWidth: 700,
            }}
          >
            {truncateText(data.title, 50)}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.secondaryAccent} 100%)`,
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            G.O.A.T.
          </div>
          <div
            style={{
              fontSize: 14,
              color: theme.textMuted,
              marginTop: 4,
            }}
          >
            Greatest Of All Time
          </div>
        </div>
      </div>

      {/* Rankings list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          flex: 1,
        }}
      >
        {topItems.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              background: getMedalGradient(item.position, theme),
              borderRadius: 16,
              padding: '14px 24px',
              border: getMedalBorder(item.position, theme),
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: getMedalColor(item.position, theme),
                width: 44,
                textAlign: 'center',
              }}
            >
              {item.position}
            </div>

            {options.showImages && item.imageUrl && (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            <div
              style={{
                fontSize: 22,
                fontWeight: item.position <= 3 ? 600 : 500,
                color: item.position <= 3 ? theme.textPrimary : theme.textSecondary,
                flex: 1,
              }}
            >
              {truncateText(item.title, 40)}
            </div>
          </div>
        ))}

        {remainingCount > 0 && (
          <div
            style={{
              fontSize: 16,
              color: theme.textMuted,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            +{remainingCount} more items
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 20,
          paddingTop: 20,
          borderTop: `1px solid ${theme.borderColor}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: theme.textMuted,
            }}
          >
            Think you can do better?
          </div>
          <div
            style={{
              background: `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.secondaryAccent} 100%)`,
              borderRadius: 8,
              padding: '8px 20px',
              color: theme.textPrimary,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            Challenge this ranking
          </div>
        </div>
        <div
          style={{
            fontSize: 16,
            color: theme.textMuted,
          }}
        >
          goat.app
        </div>
      </div>
    </div>
  );
}

/**
 * Grid Layout - Visual grid with images
 */
function renderGridLayout(data: OGCardData, options: OGCardOptions, theme: OGCardTheme) {
  const maxItems = Math.min(options.maxItems || 6, 6);
  const topItems = data.items.slice(0, maxItems);
  const remainingCount = (data.totalItems || data.items.length) - topItems.length;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.backgroundGradient,
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: 40,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          background: `radial-gradient(circle, ${theme.accentColor}20 0%, transparent 70%)`,
          borderRadius: '50%',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background: `${theme.accentColor}33`,
                border: `1px solid ${theme.accentColor}4d`,
                borderRadius: 6,
                padding: '4px 12px',
                color: theme.accentColor,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {data.category}
            </div>
            {data.timePeriod && (
              <div
                style={{
                  background: `${theme.secondaryAccent}33`,
                  border: `1px solid ${theme.secondaryAccent}4d`,
                  borderRadius: 6,
                  padding: '4px 12px',
                  color: theme.secondaryAccent,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {data.timePeriod}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: theme.textPrimary,
              lineHeight: 1.2,
            }}
          >
            {truncateText(data.title, 45)}
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            background: `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.secondaryAccent} 100%)`,
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          G.O.A.T.
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          flex: 1,
          alignContent: 'flex-start',
        }}
      >
        {topItems.map((item, index) => {
          const isTopThree = item.position <= 3;
          const cardWidth = 'calc(33.33% - 11px)';

          return (
            <div
              key={index}
              style={{
                width: cardWidth,
                display: 'flex',
                flexDirection: 'column',
                background: isTopThree
                  ? `linear-gradient(135deg, ${getMedalColor(item.position, theme)}15 0%, ${getMedalColor(item.position, theme)}05 100%)`
                  : 'rgba(255, 255, 255, 0.03)',
                borderRadius: 12,
                border: isTopThree
                  ? `1px solid ${getMedalColor(item.position, theme)}40`
                  : `1px solid ${theme.borderColor}`,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 140,
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: 48,
                      fontWeight: 700,
                      color: theme.textMuted,
                      opacity: 0.3,
                    }}
                  >
                    {item.position}
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: isTopThree ? getMedalColor(item.position, theme) : theme.textMuted,
                    color: isTopThree ? '#000' : theme.textPrimary,
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  #{item.position}
                </div>
              </div>
              <div
                style={{
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: theme.textPrimary,
                    lineHeight: 1.3,
                  }}
                >
                  {truncateText(item.title, 25)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${theme.borderColor}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {remainingCount > 0 && (
            <div
              style={{
                fontSize: 14,
                color: theme.textMuted,
              }}
            >
              +{remainingCount} more items
            </div>
          )}
          <div
            style={{
              background: `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.secondaryAccent} 100%)`,
              borderRadius: 6,
              padding: '6px 16px',
              color: theme.textPrimary,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            See full ranking
          </div>
        </div>
        <div
          style={{
            fontSize: 14,
            color: theme.textMuted,
          }}
        >
          goat.app
        </div>
      </div>
    </div>
  );
}

/**
 * Featured Layout - Podium style for top 3
 */
function renderFeaturedLayout(data: OGCardData, options: OGCardOptions, theme: OGCardTheme) {
  const topItems = data.items.slice(0, 3);
  const itemCount = data.totalItems || data.items.length;

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = topItems.length >= 3
    ? [topItems[1], topItems[0], topItems[2]]
    : topItems;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.backgroundGradient,
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: 40,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 600,
          background: `radial-gradient(circle, ${theme.goldColor}15 0%, transparent 60%)`,
          borderRadius: '50%',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                background: `${theme.accentColor}33`,
                border: `1px solid ${theme.accentColor}4d`,
                borderRadius: 6,
                padding: '4px 12px',
                color: theme.accentColor,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {data.category}
              {data.subcategory && ` • ${data.subcategory}`}
            </div>
            {data.timePeriod && (
              <div
                style={{
                  background: `${theme.secondaryAccent}33`,
                  border: `1px solid ${theme.secondaryAccent}4d`,
                  borderRadius: 6,
                  padding: '4px 12px',
                  color: theme.secondaryAccent,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {data.timePeriod}
              </div>
            )}
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: theme.textPrimary,
              lineHeight: 1.2,
            }}
          >
            {truncateText(data.title, 40)}
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            background: `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.secondaryAccent} 100%)`,
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          G.O.A.T.
        </div>
      </div>

      {/* Podium */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 20,
          flex: 1,
          paddingBottom: 20,
          zIndex: 1,
        }}
      >
        {podiumOrder.map((item, index) => {
          if (!item) return null;

          const isWinner = item.position === 1;
          const isSecond = item.position === 2;
          const cardHeight = isWinner ? 320 : isSecond ? 280 : 250;
          const imageHeight = isWinner ? 180 : isSecond ? 150 : 130;
          const medalColor = getMedalColor(item.position, theme);

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: isWinner ? 280 : 220,
                height: cardHeight,
              }}
            >
              {isWinner && (
                <div
                  style={{
                    fontSize: 40,
                    marginBottom: 8,
                  }}
                >
                  👑
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: `linear-gradient(135deg, ${medalColor}20 0%, ${medalColor}08 100%)`,
                  border: `2px solid ${medalColor}60`,
                  borderRadius: 16,
                  overflow: 'hidden',
                  width: '100%',
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: imageHeight,
                    background: 'rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 64,
                        fontWeight: 700,
                        color: medalColor,
                        opacity: 0.5,
                      }}
                    >
                      {item.position}
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -16,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: medalColor,
                      color: '#000',
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 700,
                      border: `3px solid ${theme.textPrimary}20`,
                    }}
                  >
                    {item.position}
                  </div>
                </div>
                <div
                  style={{
                    padding: '24px 16px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: isWinner ? 20 : 16,
                      fontWeight: 700,
                      color: theme.textPrimary,
                      lineHeight: 1.3,
                    }}
                  >
                    {truncateText(item.title, isWinner ? 25 : 20)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 16,
          borderTop: `1px solid ${theme.borderColor}`,
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {itemCount > 3 && (
            <div
              style={{
                fontSize: 14,
                color: theme.textMuted,
              }}
            >
              +{itemCount - 3} more in full ranking
            </div>
          )}
          <div
            style={{
              background: `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.secondaryAccent} 100%)`,
              borderRadius: 6,
              padding: '6px 16px',
              color: theme.textPrimary,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            See full ranking
          </div>
        </div>
        <div
          style={{
            fontSize: 14,
            color: theme.textMuted,
          }}
        >
          goat.app
        </div>
      </div>
    </div>
  );
}
