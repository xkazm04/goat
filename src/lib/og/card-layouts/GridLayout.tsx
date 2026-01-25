/**
 * GridLayout - OG Card Layout
 * Displays rankings in a grid format with images
 * Best for: Visual categories (movies, albums, games) with images
 */

import type { OGCardData, OGCardTheme, OGCardOptions } from '../types';
import { DEFAULT_THEME } from '../types';
import {
  getMedalColor,
  truncateText,
} from '../OGCardGenerator';

interface GridLayoutProps {
  data: OGCardData;
  options: OGCardOptions;
  theme?: OGCardTheme;
}

export function GridLayout({ data, options, theme = DEFAULT_THEME }: GridLayoutProps) {
  // Grid shows 6 items in 2 rows of 3
  const maxItems = Math.min(options.maxItems || 6, 6);
  const topItems = data.items.slice(0, maxItems);
  const itemCount = data.totalItems || data.items.length;
  const remainingCount = itemCount - topItems.length;

  // Calculate grid layout
  const columns = Math.min(topItems.length, 3);
  const rows = Math.ceil(topItems.length / 3);

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
      {/* Decorative elements */}
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

      {/* Header section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Category badge */}
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

          {/* Title */}
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

        {/* GOAT branding */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
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
      </div>

      {/* Grid of items */}
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
          const cardWidth = columns === 3 ? 'calc(33.33% - 11px)' : columns === 2 ? 'calc(50% - 8px)' : '100%';

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
              {/* Image container */}
              <div
                style={{
                  width: '100%',
                  height: rows === 1 ? 200 : 140,
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

                {/* Position badge overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: isTopThree
                      ? getMedalColor(item.position, theme)
                      : theme.textMuted,
                    color: isTopThree ? '#000' : theme.textPrimary,
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  #{item.position}
                </div>
              </div>

              {/* Item info */}
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
                {item.subtitle && (
                  <div
                    style={{
                      fontSize: 13,
                      color: theme.textMuted,
                    }}
                  >
                    {truncateText(item.subtitle, 30)}
                  </div>
                )}
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
