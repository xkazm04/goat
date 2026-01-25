/**
 * Platform Adapters Index
 * Exports all platform-specific sharing adapters
 */

// Base adapter
export { BasePlatformAdapter } from './base';

// Platform adapters
export { TwitterAdapter, twitterAdapter } from './twitter';
export { InstagramAdapter, instagramAdapter } from './instagram';
export { RedditAdapter, redditAdapter } from './reddit';
export { DiscordAdapter, discordAdapter } from './discord';
export { WhatsAppAdapter, whatsappAdapter } from './whatsapp';
export { TelegramAdapter, telegramAdapter } from './telegram';
export { FacebookAdapter, facebookAdapter } from './facebook';
export { LinkedInAdapter, linkedinAdapter } from './linkedin';
export { EmailAdapter, emailAdapter } from './email';
export { NativeShareAdapter, nativeShareAdapter, isWebShareAvailable, canShareFiles } from './native';
export { CopyAdapter, copyAdapter } from './copy';

import type { SharePlatform } from '../types';
import type { BasePlatformAdapter } from './base';
import { twitterAdapter } from './twitter';
import { instagramAdapter } from './instagram';
import { redditAdapter } from './reddit';
import { discordAdapter } from './discord';
import { whatsappAdapter } from './whatsapp';
import { telegramAdapter } from './telegram';
import { facebookAdapter } from './facebook';
import { linkedinAdapter } from './linkedin';
import { emailAdapter } from './email';
import { nativeShareAdapter } from './native';
import { copyAdapter } from './copy';

/**
 * Map of all platform adapters
 */
export const platformAdapters: Record<SharePlatform, BasePlatformAdapter> = {
  twitter: twitterAdapter,
  instagram: instagramAdapter,
  reddit: redditAdapter,
  discord: discordAdapter,
  whatsapp: whatsappAdapter,
  telegram: telegramAdapter,
  facebook: facebookAdapter,
  linkedin: linkedinAdapter,
  email: emailAdapter,
  native: nativeShareAdapter,
  copy: copyAdapter,
  tiktok: twitterAdapter, // TikTok uses same pattern as Twitter for now
};

/**
 * Get adapter for a platform
 */
export function getPlatformAdapter(platform: SharePlatform): BasePlatformAdapter {
  return platformAdapters[platform];
}

/**
 * Get all available platform adapters
 */
export function getAllAdapters(): BasePlatformAdapter[] {
  return Object.values(platformAdapters);
}

/**
 * Get adapters suitable for current environment
 */
export function getAvailableAdapters(): BasePlatformAdapter[] {
  const adapters = getAllAdapters();

  // Filter based on environment
  return adapters.filter((adapter) => {
    // Instagram only works on mobile
    if (adapter.config.platform === 'instagram') {
      return typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    }

    return true;
  });
}
