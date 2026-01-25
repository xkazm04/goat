/**
 * Sharing Module
 * Multi-platform social sharing with native integrations
 */

// Types
export type {
  SharePlatform,
  ShareContentType,
  ImageFormat,
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  ShareEvent,
  ShareResult,
  ShareOptions,
  PlatformCapabilities,
  WebShareData,
  ShareAnalyticsSummary,
} from './types';

// ShareManager
export {
  ShareManager,
  getShareManager,
  createShareManager,
  type ShareManagerOptions,
} from './ShareManager';

// ContentOptimizer
export {
  ContentOptimizer,
  getContentOptimizer,
  createContentOptimizer,
  type UTMParams,
} from './ContentOptimizer';

// ShareAnalytics
export {
  ShareAnalytics,
  getShareAnalytics,
  createShareAnalytics,
} from './ShareAnalytics';

// DeepLinkGenerator
export {
  DeepLinkGenerator,
  getDeepLinkGenerator,
  createDeepLinkGenerator,
  type DeepLinkConfig,
} from './DeepLinkGenerator';

// Platform adapters
export {
  BasePlatformAdapter,
  getPlatformAdapter,
  getAllAdapters,
  getAvailableAdapters,
  isWebShareAvailable,
  canShareFiles,
} from './platforms';

// Individual platform adapters (for direct use if needed)
export { twitterAdapter } from './platforms/twitter';
export { instagramAdapter } from './platforms/instagram';
export { redditAdapter } from './platforms/reddit';
export { discordAdapter } from './platforms/discord';
export { whatsappAdapter } from './platforms/whatsapp';
export { telegramAdapter } from './platforms/telegram';
export { facebookAdapter } from './platforms/facebook';
export { linkedinAdapter } from './platforms/linkedin';
export { emailAdapter } from './platforms/email';
export { nativeShareAdapter } from './platforms/native';
export { copyAdapter } from './platforms/copy';
