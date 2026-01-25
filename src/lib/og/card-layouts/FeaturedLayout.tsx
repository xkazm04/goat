/**
 * FeaturedLayout - OG Card Layout
 * Highlights top 3 items with large imagery and medal podium style
 * Best for: Premium shares, top 3 lists, visual impact
 */

import type { OGCardData, OGCardTheme, OGCardOptions } from '../types';
import { DEFAULT_THEME } from '../types';
import {
  getMedalColor,
  truncateText,
} from '../OGCardGenerator';

interface FeaturedLayoutProps {
  data: OGCardData;
  options: OGCardOptions;
  theme?: OGCardTheme;
}

export function FeaturedLayout({ data, options, theme = DEFAULT_THEME }: FeaturedLayoutProps) {
  // Featured layout shows top 3 in podium style
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
      {/* Spotlight effect behind winner */}
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

      {/* Header section */}
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
          {/* Category and time */}
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

          {/* Title */}
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

        {/* GOAT branding */}
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

      {/* Podium section */}
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
          const isThird = item.position === 3;

          // Heights: 1st = tallest, 2nd = medium, 3rd = shortest
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
              {/* Medal/Crown icon for winner */}
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

              {/* Card container */}
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
                {/* Image */}
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

                  {/* Position badge */}
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

                {/* Item info */}
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
                      marginBottom: 4,
                    }}
                  >
                    {truncateText(item.title, isWinner ? 25 : 20)}
                  </div>
                  {item.subtitle && (
                    <div
                      style={{
                        fontSize: 13,
                        color: theme.textMuted,
                      }}
                    >
                      {truncateText(item.subtitle, 20)}
                    </div>
                  )}
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
            {options.ctaText || 'See full ranking'}
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
