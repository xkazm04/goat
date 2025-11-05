import { GridItemType } from '@/types/match';

export interface ShareConfig {
  title: string;
  category: string;
  subcategory?: string;
  itemCount: number;
  timePeriod?: string;
  imageUrl?: string;
  url?: string;
}

export interface SocialPlatform {
  name: string;
  icon: string;
  color: string;
  generateUrl: (config: ShareConfig) => string;
}

/**
 * Generate Twitter/X share URL with pre-filled text
 */
export function generateTwitterShareUrl(config: ShareConfig): string {
  const { title, category, itemCount, timePeriod, imageUrl, url } = config;

  const timePeriodText = timePeriod ? ` (${timePeriod})` : '';
  const text = `My Top ${itemCount} ${category}${timePeriodText}\n\n"${title}"\n\nCreated with GOAT`;

  const params = new URLSearchParams({
    text,
    ...(url && { url }),
    hashtags: 'GOAT,Rankings,Top50',
  });

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Generate Facebook share URL
 */
export function generateFacebookShareUrl(config: ShareConfig): string {
  const { url } = config;

  if (!url) {
    return 'https://www.facebook.com/sharer/sharer.php';
  }

  const params = new URLSearchParams({
    u: url,
  });

  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Generate LinkedIn share URL
 */
export function generateLinkedInShareUrl(config: ShareConfig): string {
  const { title, category, url } = config;

  const params = new URLSearchParams({
    ...(url && { url }),
    title: `My ${category} Rankings - ${title}`,
    summary: `Check out my top rankings created with GOAT`,
  });

  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/**
 * Generate Reddit share URL
 */
export function generateRedditShareUrl(config: ShareConfig): string {
  const { title, category, url } = config;

  const params = new URLSearchParams({
    ...(url && { url }),
    title: `My Top ${category} Rankings: ${title}`,
  });

  return `https://reddit.com/submit?${params.toString()}`;
}

/**
 * Generate WhatsApp share URL
 */
export function generateWhatsAppShareUrl(config: ShareConfig): string {
  const { title, category, itemCount, url } = config;

  const text = `Check out my Top ${itemCount} ${category} rankings: "${title}"${url ? `\n\n${url}` : ''}`;

  const params = new URLSearchParams({
    text,
  });

  return `https://wa.me/?${params.toString()}`;
}

/**
 * Copy share text to clipboard
 */
export async function copyShareTextToClipboard(config: ShareConfig): Promise<boolean> {
  const { title, category, itemCount, timePeriod, url } = config;

  const timePeriodText = timePeriod ? ` (${timePeriod})` : '';
  const text = `My Top ${itemCount} ${category}${timePeriodText}\n\n"${title}"\n\n${url || 'Created with GOAT'}`;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Get all available social platforms
 */
export function getSocialPlatforms(): SocialPlatform[] {
  return [
    {
      name: 'Twitter',
      icon: 'twitter',
      color: '#1DA1F2',
      generateUrl: generateTwitterShareUrl,
    },
    {
      name: 'Facebook',
      icon: 'facebook',
      color: '#4267B2',
      generateUrl: generateFacebookShareUrl,
    },
    {
      name: 'LinkedIn',
      icon: 'linkedin',
      color: '#0077B5',
      generateUrl: generateLinkedInShareUrl,
    },
    {
      name: 'Reddit',
      icon: 'reddit',
      color: '#FF4500',
      generateUrl: generateRedditShareUrl,
    },
    {
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: '#25D366',
      generateUrl: generateWhatsAppShareUrl,
    },
  ];
}

/**
 * Open share dialog for a specific platform
 */
export function openShareDialog(platform: string, config: ShareConfig): void {
  let url: string;

  switch (platform.toLowerCase()) {
    case 'twitter':
    case 'x':
      url = generateTwitterShareUrl(config);
      break;
    case 'facebook':
      url = generateFacebookShareUrl(config);
      break;
    case 'linkedin':
      url = generateLinkedInShareUrl(config);
      break;
    case 'reddit':
      url = generateRedditShareUrl(config);
      break;
    case 'whatsapp':
      url = generateWhatsAppShareUrl(config);
      break;
    default:
      console.warn(`Unknown platform: ${platform}`);
      return;
  }

  // Open in a new window with specific dimensions
  const width = 600;
  const height = 400;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  window.open(
    url,
    'share-dialog',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}

/**
 * Use Web Share API if available (mobile)
 */
export async function shareViaWebAPI(config: ShareConfig, imageBlob?: Blob): Promise<boolean> {
  if (!navigator.share) {
    console.warn('Web Share API not supported');
    return false;
  }

  const { title, category, itemCount, url } = config;
  const text = `My Top ${itemCount} ${category}: "${title}"`;

  try {
    const shareData: ShareData = {
      title: text,
      text,
      url,
    };

    // Include image if provided and supported
    if (imageBlob && navigator.canShare) {
      const file = new File([imageBlob], 'ranking.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        shareData.files = [file];
      }
    }

    await navigator.share(shareData);
    return true;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      // User cancelled the share
      console.log('Share cancelled by user');
    } else {
      console.error('Error sharing:', error);
    }
    return false;
  }
}

/**
 * Generate shareable metadata for grid items
 */
export function generateShareMetadata(
  items: GridItemType[],
  listMetadata: any
): ShareConfig {
  const matchedItems = items.filter(item => item.matched);
  const topItems = matchedItems.slice(0, 5);

  const timePeriod = listMetadata.timePeriod === 'decade' && listMetadata.selectedDecade
    ? `${listMetadata.selectedDecade}s`
    : listMetadata.timePeriod === 'year' && listMetadata.selectedYear
    ? `${listMetadata.selectedYear}`
    : 'All Time';

  return {
    title: listMetadata.title,
    category: listMetadata.category,
    subcategory: listMetadata.subcategory,
    itemCount: matchedItems.length,
    timePeriod,
  };
}

/**
 * Download image blob as file
 */
export function downloadImage(blob: Blob, filename: string = 'goat-ranking.png'): void {
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
 * Create a shareable image URL (for upload services)
 */
export async function uploadImageToService(blob: Blob): Promise<string | null> {
  // This would integrate with your image hosting service
  // For now, we'll return a data URL for demonstration
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
