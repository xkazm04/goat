/**
 * Tier List Image Exporter
 * Generates shareable tier list images optimized for social media
 */

import { TierListTier } from './tierPresets';
import { BacklogItemType } from '@/types/match';

/**
 * Tier with resolved item data
 */
interface TierWithItems extends TierListTier {
  itemData: BacklogItemType[];
}

/**
 * Export configuration
 */
export interface TierListExportConfig {
  title?: string;
  width?: number;
  height?: number;
  showTierLabels?: boolean;
  showItemTitles?: boolean;
  backgroundColor?: string;
  watermark?: string;
  quality?: number;
}

/**
 * Default export configuration
 */
const DEFAULT_CONFIG: Required<TierListExportConfig> = {
  title: 'Tier List',
  width: 1200,
  height: 675, // Optimized for Twitter/social media
  showTierLabels: true,
  showItemTitles: true,
  backgroundColor: '#0f172a', // slate-900
  watermark: 'G.O.A.T.',
  quality: 0.95,
};

/**
 * Load an image from URL
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Draw rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw tier label
 */
function drawTierLabel(
  ctx: CanvasRenderingContext2D,
  tier: TierWithItems,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // Background with gradient effect
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, tier.customColor || tier.color.primary);
  gradient.addColorStop(1, tier.customColor || tier.color.secondary);

  ctx.fillStyle = gradient;
  drawRoundedRect(ctx, x, y, width, height, 8);
  ctx.fill();

  // Label text
  ctx.fillStyle = tier.color.text;
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tier.customLabel || tier.label, x + width / 2, y + height / 2);
}

/**
 * Draw item card
 */
async function drawItemCard(
  ctx: CanvasRenderingContext2D,
  item: BacklogItemType,
  x: number,
  y: number,
  size: number,
  showTitle: boolean
): Promise<void> {
  const padding = 2;
  const innerSize = size - padding * 2;
  const radius = 6;

  // Background
  ctx.fillStyle = '#1e293b'; // slate-800
  drawRoundedRect(ctx, x, y, size, size, radius);
  ctx.fill();

  // Image
  if (item.image_url) {
    try {
      const img = await loadImage(item.image_url);

      // Clip to rounded rect
      ctx.save();
      drawRoundedRect(ctx, x + padding, y + padding, innerSize, innerSize, radius - padding);
      ctx.clip();

      // Draw image centered and cropped
      const aspectRatio = img.width / img.height;
      let drawWidth = innerSize;
      let drawHeight = innerSize;
      let drawX = x + padding;
      let drawY = y + padding;

      if (aspectRatio > 1) {
        drawWidth = innerSize * aspectRatio;
        drawX -= (drawWidth - innerSize) / 2;
      } else {
        drawHeight = innerSize / aspectRatio;
        drawY -= (drawHeight - innerSize) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    } catch (error) {
      // Draw placeholder
      ctx.fillStyle = '#334155'; // slate-700
      drawRoundedRect(ctx, x + padding, y + padding, innerSize, innerSize, radius - padding);
      ctx.fill();

      // Initial
      const title = item.title || item.name || '?';
      ctx.fillStyle = '#64748b'; // slate-500
      ctx.font = 'bold 24px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title.charAt(0).toUpperCase(), x + size / 2, y + size / 2);
    }
  } else {
    // Draw placeholder
    ctx.fillStyle = '#334155';
    drawRoundedRect(ctx, x + padding, y + padding, innerSize, innerSize, radius - padding);
    ctx.fill();

    const title = item.title || item.name || '?';
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.charAt(0).toUpperCase(), x + size / 2, y + size / 2);
  }

  // Title overlay
  if (showTitle) {
    const title = item.title || item.name || '';
    if (title) {
      // Gradient overlay at bottom
      const overlayHeight = 24;
      const overlayGradient = ctx.createLinearGradient(
        x, y + size - overlayHeight, x, y + size
      );
      overlayGradient.addColorStop(0, 'rgba(0,0,0,0)');
      overlayGradient.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = overlayGradient;
      ctx.fillRect(x + padding, y + size - overlayHeight, innerSize, overlayHeight);

      // Title text
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      // Truncate if too long
      const maxWidth = innerSize - 8;
      let displayTitle = title;
      while (ctx.measureText(displayTitle).width > maxWidth && displayTitle.length > 3) {
        displayTitle = displayTitle.slice(0, -4) + '...';
      }

      ctx.fillText(displayTitle, x + size / 2, y + size - 4);
    }
  }
}

/**
 * Export tier list as image
 */
export async function exportTierListImage(
  tiers: TierWithItems[],
  config: TierListExportConfig = {}
): Promise<void> {
  const opts = { ...DEFAULT_CONFIG, ...config };

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = opts.width;
  canvas.height = opts.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Background
  ctx.fillStyle = opts.backgroundColor;
  ctx.fillRect(0, 0, opts.width, opts.height);

  // Title
  const titleHeight = 60;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.title, opts.width / 2, titleHeight / 2);

  // Calculate dimensions
  const padding = 16;
  const tierLabelWidth = 60;
  const tierRowHeight = 80;
  const itemSize = 64;
  const itemGap = 8;
  const tierGap = 6;

  // Calculate available height for tiers
  const availableHeight = opts.height - titleHeight - padding * 2 - 30; // 30 for watermark
  const tiersCount = tiers.length;
  const actualTierHeight = Math.min(tierRowHeight, (availableHeight - tierGap * (tiersCount - 1)) / tiersCount);
  const actualItemSize = Math.min(itemSize, actualTierHeight - 12);

  // Draw tiers
  let currentY = titleHeight + padding;

  for (const tier of tiers) {
    // Draw tier label
    if (opts.showTierLabels) {
      drawTierLabel(ctx, tier, padding, currentY, tierLabelWidth, actualTierHeight);
    }

    // Draw tier background
    const tierBgX = padding + (opts.showTierLabels ? tierLabelWidth + 4 : 0);
    const tierBgWidth = opts.width - tierBgX - padding;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.5)'; // slate-800/50
    drawRoundedRect(ctx, tierBgX, currentY, tierBgWidth, actualTierHeight, 8);
    ctx.fill();

    // Draw items
    const itemsPerRow = Math.floor((tierBgWidth - itemGap * 2) / (actualItemSize + itemGap));
    let itemX = tierBgX + itemGap;
    const itemY = currentY + (actualTierHeight - actualItemSize) / 2;

    for (let i = 0; i < tier.itemData.length && i < itemsPerRow; i++) {
      const item = tier.itemData[i];
      await drawItemCard(ctx, item, itemX, itemY, actualItemSize, opts.showItemTitles);
      itemX += actualItemSize + itemGap;
    }

    // If more items than fit, show count
    if (tier.itemData.length > itemsPerRow) {
      const remaining = tier.itemData.length - itemsPerRow;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)'; // slate-400
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `+${remaining} more`,
        tierBgX + tierBgWidth - 8,
        currentY + actualTierHeight / 2
      );
    }

    currentY += actualTierHeight + tierGap;
  }

  // Watermark
  if (opts.watermark) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.3)'; // slate-400/30
    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(opts.watermark, opts.width - padding, opts.height - 8);
  }

  // Convert to blob and download
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/png',
      opts.quality
    );
  });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${opts.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_tier_list.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate shareable tier list URL
 */
export function generateShareUrl(
  tiers: TierWithItems[],
  listId: string
): string {
  // Create a compact representation of tier placements
  const placements = tiers.map(tier => ({
    t: tier.label,
    i: tier.itemData.map(item => item.id),
  }));

  const encoded = btoa(JSON.stringify(placements));
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return `${baseUrl}/share/tierlist/${listId}?data=${encoded}`;
}

/**
 * Export dimensions for different social platforms
 */
export const SOCIAL_EXPORT_DIMENSIONS = {
  twitter: { width: 1200, height: 675 },
  instagram: { width: 1080, height: 1080 },
  discord: { width: 800, height: 600 },
  reddit: { width: 1200, height: 800 },
  youtube: { width: 1280, height: 720 },
} as const;

/**
 * Get recommended dimensions for a platform
 */
export function getExportDimensionsForPlatform(
  platform: keyof typeof SOCIAL_EXPORT_DIMENSIONS
): { width: number; height: number } {
  return SOCIAL_EXPORT_DIMENSIONS[platform];
}
