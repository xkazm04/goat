/**
 * Image Utilities
 *
 * Shared utilities for canvas-to-blob conversion, image format conversion,
 * and file downloads. Extracted for reuse across image export features.
 */

export type ImageFormat = 'png' | 'jpg' | 'webp';
export type ImageQuality = 'standard' | 'high' | 'ultra';

/**
 * Quality multipliers for canvas.toBlob()
 * Maps quality presets to numeric values (0-1)
 */
const QUALITY_MAP: Record<ImageQuality, number> = {
  standard: 0.8,
  high: 0.92,
  ultra: 1.0,
};

/**
 * Converts an image format string to its corresponding MIME type
 */
export function formatToMimeType(format: ImageFormat): string {
  if (format === 'jpg') {
    return 'image/jpeg';
  }
  return `image/${format}`;
}

/**
 * Converts a Blob to a different image format using canvas
 *
 * @param blob - Source image blob
 * @param format - Target image format ('png', 'jpg', 'webp')
 * @param quality - Quality preset ('standard', 'high', 'ultra')
 * @returns Promise resolving to the converted blob
 */
export async function convertImageFormat(
  blob: Blob,
  format: ImageFormat,
  quality: ImageQuality = 'high'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas 2D context'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const mimeType = formatToMimeType(format);
      canvas.toBlob(
        (resultBlob) => {
          if (resultBlob) {
            resolve(resultBlob);
          } else {
            reject(new Error('Canvas toBlob returned null'));
          }
        },
        mimeType,
        QUALITY_MAP[quality]
      );

      // Clean up object URL
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for conversion'));
    };

    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Converts a canvas element to a Blob
 *
 * @param canvas - HTML canvas element
 * @param format - Image format ('png', 'jpg', 'webp')
 * @param quality - Quality preset ('standard', 'high', 'ultra')
 * @returns Promise resolving to the blob
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat = 'png',
  quality: ImageQuality = 'high'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = formatToMimeType(format);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      },
      mimeType,
      QUALITY_MAP[quality]
    );
  });
}

/**
 * Downloads a Blob as a file
 *
 * @param blob - The blob to download
 * @param filename - The filename for the download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Estimates file size based on format and quality
 *
 * @param baseSize - Base size in KB (e.g., for a standard PNG)
 * @param format - Image format
 * @param quality - Quality preset
 * @returns Estimated size in KB
 */
export function estimateImageSize(
  baseSize: number,
  format: ImageFormat,
  quality: ImageQuality
): number {
  const multipliers: Record<ImageFormat, Record<ImageQuality, number>> = {
    png: { standard: 1.0, high: 1.5, ultra: 2.0 },
    jpg: { standard: 0.3, high: 0.5, ultra: 0.8 },
    webp: { standard: 0.25, high: 0.4, ultra: 0.6 },
  };

  return baseSize * multipliers[format][quality];
}

/**
 * Formats a file size in KB to a human-readable string
 *
 * @param sizeKB - Size in kilobytes
 * @returns Formatted string (e.g., "~500 KB" or "~1.5 MB")
 */
export function formatFileSize(sizeKB: number): string {
  if (sizeKB > 1000) {
    return `~${(sizeKB / 1000).toFixed(1)} MB`;
  }
  return `~${Math.round(sizeKB)} KB`;
}
