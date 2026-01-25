/**
 * ListLayout - OG Card Layout
 * Displays rankings in a vertical list format with position numbers
 * Best for: Standard ranking displays, 5-10 items
 */

import type { OGCardData, OGCardTheme, OGCardOptions } from '../types';
import { DEFAULT_THEME } from '../types';
import {
  getMedalColor,
  getMedalGradient,
  getMedalBorder,
  truncateText,
  formatCount,
} from '../OGCardGenerator';

interface ListLayoutProps {
  data: OGCardData;
  options: OGCardOptions;
  theme?: OGCardTheme;
}

export function ListLayout({ data, options, theme = DEFAULT_THEME }: ListLayoutProps) {
  const maxItems = options.maxItems || 5;
  const topItems = data.items.slice(0, maxItems);
  const itemCount = data.totalItems || data.items.length;
  const remainingCount = itemCount - topItems.length;

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
      {/* Decorative gradient circles */}
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

      {/* Header section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Category badges */}
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

          {/* Title */}
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
              fontSize: 36,
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.secondaryAccent} 100%)`,
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {options.brandingText || 'G.O.A.T.'}
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
            {/* Position number */}
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

            {/* Item image */}
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

            {/* Item title */}
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

            {/* Optional score */}
            {item.score !== undefined && (
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: theme.accentColor,
                }}
              >
                {item.score}
              </div>
            )}
          </div>
        ))}

        {/* More items indicator */}
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
          {/* Social proof */}
          {options.showSocialProof && data.viewCount !== undefined && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: theme.textMuted,
                fontSize: 16,
              }}
            >
              <span>{formatCount(data.viewCount)} views</span>
              {data.challengeCount !== undefined && data.challengeCount > 0 && (
                <>
                  <span>•</span>
                  <span>{formatCount(data.challengeCount)} challenges</span>
                </>
              )}
            </div>
          )}

          {!options.showSocialProof && (
            <>
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
                {options.ctaText || 'Challenge this ranking'}
              </div>
            </>
          )}
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
