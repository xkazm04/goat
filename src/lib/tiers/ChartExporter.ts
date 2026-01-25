/**
 * ChartExporter
 * Export tier charts and visualizations as images
 */

import { TierDefinition, TierStats } from './types';
import { TierChartData } from './components/TierChart';

/**
 * Export options
 */
export interface ChartExportOptions {
  /** Image format */
  format: 'png' | 'jpeg' | 'svg';
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** Background color (null for transparent) */
  backgroundColor?: string | null;
  /** Quality for JPEG (0-1) */
  quality?: number;
  /** Include title */
  title?: string;
  /** Include timestamp */
  includeTimestamp?: boolean;
  /** Include watermark */
  watermark?: string;
  /** Scale factor for high DPI */
  scale?: number;
}

/**
 * Default export options
 */
const defaultOptions: Required<ChartExportOptions> = {
  format: 'png',
  width: 800,
  height: 600,
  backgroundColor: '#ffffff',
  quality: 0.92,
  title: '',
  includeTimestamp: false,
  watermark: '',
  scale: 2,
};

/**
 * Render tier chart to canvas
 */
function renderChartToCanvas(
  ctx: CanvasRenderingContext2D,
  data: TierChartData[],
  options: Required<ChartExportOptions>
): void {
  const { width, height, backgroundColor, title, includeTimestamp, watermark } = options;

  // Background
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Padding
  const padding = 40;
  const chartTop = title ? 80 : padding;
  const chartBottom = includeTimestamp || watermark ? height - 60 : height - padding;
  const chartLeft = padding + 60;  // Room for tier labels
  const chartRight = width - padding;
  const chartHeight = chartBottom - chartTop;
  const chartWidth = chartRight - chartLeft;

  // Title
  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 50);
  }

  // Calculate max value
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.stats.filledCount, d.stats.itemCount)),
    1
  );

  // Bar dimensions
  const barCount = data.length;
  const barGap = 8;
  const barHeight = (chartHeight - (barCount - 1) * barGap) / barCount;

  // Draw bars
  data.forEach((item, index) => {
    const y = chartTop + index * (barHeight + barGap);
    const filledWidth = (item.stats.filledCount / maxValue) * chartWidth;
    const capacityWidth = (item.stats.itemCount / maxValue) * chartWidth;

    // Tier label
    ctx.fillStyle = item.tier.color.primary;
    ctx.fillRect(padding, y, 50, barHeight);

    ctx.fillStyle = item.tier.color.text;
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.tier.label, padding + 25, y + barHeight / 2);

    // Background bar (capacity)
    ctx.fillStyle = '#e5e5e5';
    ctx.fillRect(chartLeft, y, capacityWidth, barHeight);

    // Filled bar
    ctx.fillStyle = item.tier.color.primary;
    ctx.fillRect(chartLeft, y, filledWidth, barHeight);

    // Value label
    ctx.fillStyle = '#000000';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${item.stats.filledCount} / ${item.stats.itemCount} (${item.stats.percentage}%)`,
      chartLeft + filledWidth + 8,
      y + barHeight / 2
    );
  });

  // Timestamp
  if (includeTimestamp) {
    ctx.fillStyle = '#666666';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      new Date().toLocaleString(),
      padding,
      height - 20
    );
  }

  // Watermark
  if (watermark) {
    ctx.fillStyle = '#999999';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(watermark, width - padding, height - 20);
  }
}

/**
 * Render pie chart to canvas
 */
function renderPieChartToCanvas(
  ctx: CanvasRenderingContext2D,
  data: TierChartData[],
  options: Required<ChartExportOptions>
): void {
  const { width, height, backgroundColor, title, includeTimestamp, watermark } = options;

  // Background
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Title
  if (title) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 50);
  }

  // Chart center and radius
  const centerX = width / 2;
  const centerY = title ? height / 2 + 20 : height / 2;
  const outerRadius = Math.min(width, height) / 3;
  const innerRadius = outerRadius * 0.6;

  // Calculate total
  const total = data.reduce((sum, d) => sum + d.stats.filledCount, 0);

  // Draw segments
  let currentAngle = -Math.PI / 2;  // Start from top

  data.forEach((item) => {
    const angle = total > 0 ? (item.stats.filledCount / total) * Math.PI * 2 : 0;

    if (angle > 0) {
      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + angle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + angle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = item.tier.color.primary;
      ctx.fill();

      // Segment border
      ctx.strokeStyle = backgroundColor || '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += angle;
    }
  });

  // Center text
  const totalFilled = data.reduce((sum, d) => sum + d.stats.filledCount, 0);
  const totalCapacity = data.reduce((sum, d) => sum + d.stats.itemCount, 0);
  const percentage = totalCapacity > 0 ? Math.round((totalFilled / totalCapacity) * 100) : 0;

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${percentage}%`, centerX, centerY - 10);

  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#666666';
  ctx.fillText(`${totalFilled} / ${totalCapacity}`, centerX, centerY + 20);

  // Legend
  const legendY = height - 80;
  const legendItemWidth = width / data.length;

  data.forEach((item, index) => {
    const x = legendItemWidth * index + legendItemWidth / 2;

    // Color box
    ctx.fillStyle = item.tier.color.primary;
    ctx.fillRect(x - 40, legendY, 16, 16);

    // Label
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.tier.label, x - 20, legendY + 12);

    // Value
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText(`${item.stats.filledCount}`, x + 10, legendY + 12);
  });

  // Timestamp
  if (includeTimestamp) {
    ctx.fillStyle = '#666666';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(new Date().toLocaleString(), 20, height - 20);
  }

  // Watermark
  if (watermark) {
    ctx.fillStyle = '#999999';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(watermark, width - 20, height - 20);
  }
}

/**
 * ChartExporter class
 */
export class ChartExporter {
  private options: Required<ChartExportOptions>;

  constructor(options: ChartExportOptions = { format: 'png' }) {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Update options
   */
  setOptions(options: Partial<ChartExportOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Export bar chart
   */
  async exportBarChart(
    data: TierChartData[],
    options?: Partial<ChartExportOptions>
  ): Promise<Blob> {
    const opts = { ...this.options, ...options };

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = opts.width * opts.scale;
    canvas.height = opts.height * opts.scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Scale for high DPI
    ctx.scale(opts.scale, opts.scale);

    // Render
    renderChartToCanvas(ctx, data, opts);

    // Export
    return this.canvasToBlob(canvas, opts);
  }

  /**
   * Export pie chart
   */
  async exportPieChart(
    data: TierChartData[],
    options?: Partial<ChartExportOptions>
  ): Promise<Blob> {
    const opts = { ...this.options, ...options };

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = opts.width * opts.scale;
    canvas.height = opts.height * opts.scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Scale for high DPI
    ctx.scale(opts.scale, opts.scale);

    // Render
    renderPieChartToCanvas(ctx, data, opts);

    // Export
    return this.canvasToBlob(canvas, opts);
  }

  /**
   * Export DOM element
   */
  async exportElement(
    element: HTMLElement,
    options?: Partial<ChartExportOptions>
  ): Promise<Blob> {
    const opts = { ...this.options, ...options };

    // Use html2canvas if available (dynamic import)
    try {
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(element, {
        backgroundColor: opts.backgroundColor || undefined,
        scale: opts.scale,
        width: opts.width,
        height: opts.height,
        useCORS: true,
      });

      return this.canvasToBlob(canvas, opts);
    } catch {
      throw new Error('html2canvas is required for DOM export. Install with: npm install html2canvas');
    }
  }

  /**
   * Export to SVG (for vector graphics)
   */
  exportToSVG(data: TierChartData[], title?: string): string {
    const width = this.options.width;
    const height = this.options.height;

    // Calculate dimensions
    const padding = 40;
    const chartTop = title ? 80 : padding;
    const chartBottom = height - padding;
    const chartLeft = padding + 60;
    const chartRight = width - padding;
    const chartHeight = chartBottom - chartTop;
    const chartWidth = chartRight - chartLeft;

    const maxValue = Math.max(
      ...data.map((d) => Math.max(d.stats.filledCount, d.stats.itemCount)),
      1
    );

    const barCount = data.length;
    const barGap = 8;
    const barHeight = (chartHeight - (barCount - 1) * barGap) / barCount;

    // Build SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`;

    // Background
    if (this.options.backgroundColor) {
      svg += `<rect width="${width}" height="${height}" fill="${this.options.backgroundColor}"/>`;
    }

    // Title
    if (title) {
      svg += `<text x="${width / 2}" y="50" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" font-weight="bold">${title}</text>`;
    }

    // Bars
    data.forEach((item, index) => {
      const y = chartTop + index * (barHeight + barGap);
      const filledWidth = (item.stats.filledCount / maxValue) * chartWidth;
      const capacityWidth = (item.stats.itemCount / maxValue) * chartWidth;

      // Tier label background
      svg += `<rect x="${padding}" y="${y}" width="50" height="${barHeight}" fill="${item.tier.color.primary}" rx="4"/>`;

      // Tier label text
      svg += `<text x="${padding + 25}" y="${y + barHeight / 2}" text-anchor="middle" dominant-baseline="middle" fill="${item.tier.color.text}" font-family="system-ui, sans-serif" font-size="16" font-weight="bold">${item.tier.label}</text>`;

      // Capacity bar
      svg += `<rect x="${chartLeft}" y="${y}" width="${capacityWidth}" height="${barHeight}" fill="#e5e5e5" rx="4"/>`;

      // Filled bar
      svg += `<rect x="${chartLeft}" y="${y}" width="${filledWidth}" height="${barHeight}" fill="${item.tier.color.primary}" rx="4"/>`;

      // Value text
      svg += `<text x="${chartLeft + filledWidth + 8}" y="${y + barHeight / 2}" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="14">${item.stats.filledCount} / ${item.stats.itemCount} (${item.stats.percentage}%)</text>`;
    });

    svg += '</svg>';
    return svg;
  }

  /**
   * Download file
   */
  async download(
    blob: Blob,
    filename: string = 'tier-chart'
  ): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${this.options.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Convert canvas to blob
   */
  private async canvasToBlob(
    canvas: HTMLCanvasElement,
    options: Required<ChartExportOptions>
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        options.quality
      );
    });
  }
}

/**
 * Factory function
 */
export function createChartExporter(options?: ChartExportOptions): ChartExporter {
  return new ChartExporter(options);
}

/**
 * Quick export helper
 */
export async function exportChartAsImage(
  data: TierChartData[],
  options: ChartExportOptions & { chartType?: 'bar' | 'pie'; filename?: string } = { format: 'png' }
): Promise<void> {
  const exporter = new ChartExporter(options);
  const blob = options.chartType === 'pie'
    ? await exporter.exportPieChart(data, options)
    : await exporter.exportBarChart(data, options);
  await exporter.download(blob, options.filename);
}

export default ChartExporter;
