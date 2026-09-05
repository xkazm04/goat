import { NextRequest, NextResponse } from 'next/server';

import {
  WidgetConfig,
  WidgetData,
  WIDGET_DIMENSIONS,
  THEME_PRESETS,
  CustomThemeColors,
  normalizeWidgetConfig,
} from '@/lib/embed';
import { getShareUrl, getServerBaseUrl } from '@/lib/sharing/share-urls';

/**
 * Parse widget config from URL parameters.
 *
 * Every field goes through `normalizeWidgetConfig` — the ONE door for the widget
 * vocabulary (registry: public-verdict-badge/embed-snippet-contract; _laws
 * one-validation-door). Before 2026-09-05 this route cast `params.get('size')`
 * straight to the union, so `?size=huge` reached `WIDGET_DIMENSIONS[size].width`
 * and threw a 500 out of a public, cacheable GET.
 */
function parseConfig(params: URLSearchParams): WidgetConfig | null {
  const listId = params.get('id');
  if (!listId) return null;

  const flag = (key: string): boolean | undefined => {
    const v = params.get(key);
    return v === null ? undefined : v !== '0';
  };
  const int = (key: string): number | undefined => {
    const v = params.get(key);
    return v === null ? undefined : parseInt(v, 10);
  };

  // Six dash-separated hex bodies; the normalizer validates each as a colour
  // and drops the whole set (falling back to the default theme) when any fails.
  const colorsStr = params.get('colors');
  const colorParts = colorsStr ? colorsStr.split('-').map((c) => `#${c}`) : null;
  const customColors =
    colorParts && colorParts.length === 6
      ? {
          background: colorParts[0],
          surface: colorParts[1],
          text: colorParts[2],
          textSecondary: colorParts[3],
          accent: colorParts[4],
          border: colorParts[5],
        }
      : undefined;

  return normalizeWidgetConfig({
    listId,
    size: (params.get('size') ?? undefined) as WidgetConfig['size'] | undefined,
    theme: (params.get('theme') ?? undefined) as WidgetConfig['theme'] | undefined,
    displayStyle: (params.get('display') ?? undefined) as WidgetConfig['displayStyle'] | undefined,
    itemCount: int('count'),
    showRanks: flag('ranks'),
    showImages: flag('images'),
    showTitle: flag('title'),
    showBranding: flag('branding'),
    interactive: flag('interactive'),
    borderRadius: int('radius'),
    customColors,
    locale: params.get('locale') ?? undefined,
  });
}

/**
 * Get theme colors
 */
function getColors(config: WidgetConfig): CustomThemeColors {
  if (config.theme === 'custom' && config.customColors) {
    return config.customColors;
  }
  // `auto` means "follow the viewer", and this runs on the server where the
  // viewer's preference is invisible. Resolving it to a constant here would not
  // pick a default, it would erase the subscription. So `auto` emits the light
  // palette as the base and defers the dark half to prefersColorSchemeBlock(),
  // which resolves where the input actually exists.
  return THEME_PRESETS[config.theme === 'auto' ? 'light' : config.theme as 'light' | 'dark'] || THEME_PRESETS.dark;
}

/**
 * For `theme=auto` only: redefine the palette custom properties when the
 * viewer's environment asks for dark. Empty for every explicit theme, so an
 * explicitly pinned widget never moves with the viewer's preference.
 */
function prefersColorSchemeBlock(config: WidgetConfig): string {
  if (config.theme !== 'auto') return '';
  const d = THEME_PRESETS.dark;
  return `
    @media (prefers-color-scheme: dark) {
      :root {
        --widget-bg: ${d.background};
        --widget-surface: ${d.surface};
        --widget-text: ${d.text};
        --widget-text-secondary: ${d.textSecondary};
        --widget-accent: ${d.accent};
        --widget-border: ${d.border};
      }
    }
`;
}

/**
 * Fetch list data
 * In production, this would query the database
 */
async function fetchListData(listId: string, itemCount: number): Promise<WidgetData | null> {
  // Placeholder data for demonstration
  // In production, this would fetch from database
  const mockData: WidgetData = {
    list: {
      id: listId,
      title: 'Top Movies of 2024',
      category: 'Movies',
      subcategory: 'Drama',
      createdAt: new Date().toISOString(),
      author: {
        name: 'User',
      },
    },
    items: Array.from({ length: itemCount }, (_, i) => ({
      rank: i + 1,
      title: `Item #${i + 1}`,
      subtitle: 'Description',
    })),
    totalItems: 10,
    fullUrl: getShareUrl(listId, getServerBaseUrl()),
  };

  return mockData;
}

/**
 * Generate widget HTML
 */
function generateWidgetHTML(
  config: WidgetConfig,
  data: WidgetData,
  colors: CustomThemeColors
): string {
  const dimensions = WIDGET_DIMENSIONS[config.size];
  // `data.fullUrl` is already absolute (share-urls builds it with the server
  // base). Prefixing it again produced `https://goat.apphttps://goat.app/share/…`
  // in both the CTA and the click handler — every deep link out of the widget
  // was dead (measured 2026-09-05: 2 origins per href).
  const baseUrl = getServerBaseUrl();
  const fullUrl = data.fullUrl;

  const itemsHTML = data.items
    .slice(0, config.itemCount)
    .map(item => `
      <div class="goat-widget-item" ${config.interactive ? `onclick="window.open('${fullUrl}', '_blank')"` : ''}>
        ${config.showRanks ? `<div class="goat-widget-rank">#${item.rank}</div>` : ''}
        ${config.showImages && item.imageUrl ? `<img class="goat-widget-image" src="${item.imageUrl}" alt="${item.title}" loading="lazy" />` : ''}
        <div class="goat-widget-info">
          <div class="goat-widget-item-title">${escapeHtml(item.title)}</div>
          ${item.subtitle ? `<div class="goat-widget-item-subtitle">${escapeHtml(item.subtitle)}</div>` : ''}
        </div>
      </div>
    `).join('');

  const sizeClass = `goat-widget--${config.size}`;
  const displayClass = config.displayStyle !== 'list' ? `goat-widget--${config.displayStyle}` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.list.title)} - GOAT Rankings</title>
  <style>
    :root {
      --widget-bg: ${colors.background};
      --widget-surface: ${colors.surface};
      --widget-text: ${colors.text};
      --widget-text-secondary: ${colors.textSecondary};
      --widget-accent: ${colors.accent};
      --widget-border: ${colors.border};
      --widget-border-radius: ${config.borderRadius}px;
    }
${prefersColorSchemeBlock(config)}
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      margin: 0;
      padding: 0;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .goat-widget {
      width: ${dimensions.width}px;
      max-width: 100%;
      background: var(--widget-bg);
      color: var(--widget-text);
      border-radius: var(--widget-border-radius);
      overflow: hidden;
      border: 1px solid var(--widget-border);
    }

    .goat-widget-header {
      padding: 16px;
      border-bottom: 1px solid var(--widget-border);
    }

    .goat-widget-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--widget-text);
      margin-bottom: 4px;
    }

    .goat-widget-subtitle {
      font-size: 12px;
      color: var(--widget-text-secondary);
    }

    .goat-widget-content {
      padding: 8px 0;
      max-height: ${dimensions.height - 120}px;
      overflow-y: auto;
    }

    .goat-widget-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      gap: 12px;
      cursor: ${config.interactive ? 'pointer' : 'default'};
      transition: background 0.15s ease;
    }

    .goat-widget-item:hover {
      background: var(--widget-surface);
    }

    .goat-widget-rank {
      font-size: 14px;
      font-weight: 700;
      color: var(--widget-accent);
      min-width: 24px;
      text-align: center;
    }

    .goat-widget-image {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      object-fit: cover;
      background: var(--widget-surface);
    }

    .goat-widget-info {
      flex: 1;
      min-width: 0;
    }

    .goat-widget-item-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--widget-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .goat-widget-item-subtitle {
      font-size: 12px;
      color: var(--widget-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .goat-widget-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--widget-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .goat-widget-cta {
      font-size: 12px;
      color: var(--widget-accent);
      text-decoration: none;
      font-weight: 500;
    }

    .goat-widget-cta:hover {
      text-decoration: underline;
    }

    .goat-widget-branding {
      font-size: 10px;
      color: var(--widget-text-secondary);
      text-decoration: none;
      opacity: 0.7;
    }

    .goat-widget-branding:hover {
      opacity: 1;
    }

    /* Compact size adjustments */
    .goat-widget--compact .goat-widget-header {
      padding: 12px;
    }

    .goat-widget--compact .goat-widget-item {
      padding: 6px 12px;
      gap: 8px;
    }

    .goat-widget--compact .goat-widget-image {
      width: 32px;
      height: 32px;
    }

    .goat-widget--compact .goat-widget-footer {
      padding: 8px 12px;
    }

    /* Grid display style */
    .goat-widget--grid .goat-widget-content {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 8px;
      padding: 12px;
    }

    .goat-widget--grid .goat-widget-item {
      flex-direction: column;
      padding: 8px;
      border-radius: 8px;
      background: var(--widget-surface);
    }

    /* Podium display style */
    .goat-widget--podium .goat-widget-content {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      padding: 16px;
      gap: 8px;
    }

    .goat-widget--podium .goat-widget-item {
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 12px;
      border-radius: 8px;
      background: var(--widget-surface);
    }

    .goat-widget--podium .goat-widget-item:nth-child(1) {
      order: 2;
      transform: scale(1.1);
    }

    .goat-widget--podium .goat-widget-item:nth-child(2) {
      order: 1;
    }

    .goat-widget--podium .goat-widget-item:nth-child(3) {
      order: 3;
    }

    /* Minimal display style */
    .goat-widget--minimal .goat-widget-header {
      display: none;
    }
  </style>
</head>
<body>
  <div class="goat-widget ${sizeClass} ${displayClass}">
    ${config.showTitle ? `
    <div class="goat-widget-header">
      <div class="goat-widget-title">${escapeHtml(data.list.title)}</div>
      <div class="goat-widget-subtitle">${escapeHtml(data.list.category)}${data.list.subcategory ? ` - ${escapeHtml(data.list.subcategory)}` : ''}</div>
    </div>
    ` : ''}

    <div class="goat-widget-content">
      ${itemsHTML}
    </div>

    <div class="goat-widget-footer">
      <a href="${fullUrl}" target="_blank" rel="noopener" class="goat-widget-cta">
        View Full Ranking &rarr;
      </a>
      ${config.showBranding ? `
      <a href="${baseUrl}" target="_blank" rel="noopener" class="goat-widget-branding">
        Powered by GOAT
      </a>
      ` : ''}
    </div>
  </div>

  <script>
    // Send ready message to parent
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'ready', listId: '${config.listId}' }, '*');
    }

  </script>
</body>
</html>`;
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * GET handler - serves the widget iframe
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Parse configuration
  const config = parseConfig(searchParams);

  if (!config) {
    return new NextResponse('Missing required parameter: id', { status: 400 });
  }

  // Fetch list data
  const data = await fetchListData(config.listId, config.itemCount);

  if (!data) {
    return new NextResponse('List not found', { status: 404 });
  }

  // Get theme colors
  const colors = getColors(config);

  // Generate HTML
  const html = generateWidgetHTML(config, data, colors);

  // Return HTML response
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
    },
  });
}
