import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';
import {
  WidgetConfig,
  WidgetData,
  WidgetItem,
  DEFAULT_WIDGET_CONFIG,
  WIDGET_DIMENSIONS,
  THEME_PRESETS,
  CustomThemeColors,
} from '@/lib/embed';

/**
 * Parse widget config from URL parameters
 */
function parseConfig(params: URLSearchParams): WidgetConfig | null {
  const listId = params.get('id');
  if (!listId) return null;

  const config: WidgetConfig = {
    listId,
    size: (params.get('size') as WidgetConfig['size']) || DEFAULT_WIDGET_CONFIG.size,
    theme: (params.get('theme') as WidgetConfig['theme']) || DEFAULT_WIDGET_CONFIG.theme,
    displayStyle: (params.get('display') as WidgetConfig['displayStyle']) || DEFAULT_WIDGET_CONFIG.displayStyle,
    itemCount: Math.min(20, Math.max(1, parseInt(params.get('count') || '5', 10))),
    showRanks: params.get('ranks') !== '0',
    showImages: params.get('images') !== '0',
    showTitle: params.get('title') !== '0',
    showBranding: params.get('branding') !== '0',
    interactive: params.get('interactive') !== '0',
    borderRadius: parseInt(params.get('radius') || '12', 10),
  };

  const locale = params.get('locale');
  if (locale) config.locale = locale;

  // Parse custom colors
  const colorsStr = params.get('colors');
  if (colorsStr && config.theme === 'custom') {
    const colors = colorsStr.split('-').map(c => `#${c}`);
    if (colors.length === 6) {
      config.customColors = {
        background: colors[0],
        surface: colors[1],
        text: colors[2],
        textSecondary: colors[3],
        accent: colors[4],
        border: colors[5],
      };
    }
  }

  return config;
}

/**
 * Get theme colors
 */
function getColors(config: WidgetConfig): CustomThemeColors {
  if (config.theme === 'custom' && config.customColors) {
    return config.customColors;
  }
  return THEME_PRESETS[config.theme === 'auto' ? 'dark' : config.theme as 'light' | 'dark'] || THEME_PRESETS.dark;
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
    fullUrl: `/share/${listId}`,
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';

  const itemsHTML = data.items
    .slice(0, config.itemCount)
    .map(item => `
      <div class="goat-widget-item" ${config.interactive ? `onclick="window.open('${baseUrl}${data.fullUrl}', '_blank')"` : ''}>
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
      <a href="${baseUrl}${data.fullUrl}" target="_blank" rel="noopener" class="goat-widget-cta">
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

    // Track impression
    fetch('${baseUrl}/api/embed/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [{
          type: 'impression',
          listId: '${config.listId}',
          configHash: 'widget',
          referrer: document.referrer || undefined,
          timestamp: Date.now()
        }]
      })
    }).catch(() => {});
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
