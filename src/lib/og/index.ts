/**
 * OG Card System
 * Exports for dynamic Open Graph card generation
 */

// Types
export type {
  OGCardLayout,
  SocialPlatform,
  CardDimensions,
  TwitterCardType,
  OGCardTheme,
  OGCardData,
  OGCardItem,
  OGCardOptions,
  OGMetadata,
  OGCacheEntry,
  OGCacheConfig,
  RegenerationEvent,
} from './types';

// Constants
export {
  PLATFORM_DIMENSIONS,
  DEFAULT_THEME,
  VIBRANT_THEME,
  MINIMAL_THEME,
  DEFAULT_OG_OPTIONS,
  DEFAULT_CACHE_CONFIG,
} from './types';

// Generator utilities
export {
  hashData,
  generateCacheKey,
  getDimensionsForPlatform,
  getMedalColor,
  getMedalGradient,
  getMedalBorder,
  truncateText,
  formatCount,
  generateOGMetadata,
  generateMetaTags,
  OGCardGenerator,
  getOGCardGenerator,
} from './OGCardGenerator';

// Cache management
export {
  OGCacheManager,
  getOGCacheManager,
  createOGCacheManager,
} from './CacheManager';

// Card layouts
export {
  ListLayout,
  GridLayout,
  FeaturedLayout,
  getLayoutComponent,
  renderLayout,
} from './card-layouts';
