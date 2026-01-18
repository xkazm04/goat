/**
 * Context Analyzer
 * Analyzes current context for personalization (time, location, device, etc.)
 */

import { PersonalizationContext } from './types';

/**
 * Get current time of day
 */
function getTimeOfDay(hour: number): PersonalizationContext['timeOfDay'] {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Get current season based on month and hemisphere
 */
function getSeason(
  month: number,
  isNorthernHemisphere: boolean = true
): PersonalizationContext['season'] {
  const seasons: PersonalizationContext['season'][] = isNorthernHemisphere
    ? ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter']
    : ['summer', 'summer', 'fall', 'fall', 'fall', 'winter', 'winter', 'winter', 'spring', 'spring', 'spring', 'summer'];

  return seasons[month];
}

/**
 * Detect device type from user agent
 */
function getDeviceType(): PersonalizationContext['deviceType'] {
  if (typeof window === 'undefined') return 'desktop';

  const ua = navigator.userAgent.toLowerCase();

  // Check for tablet first (some tablets have 'mobile' in UA)
  if (
    /ipad|tablet|playbook|silk/.test(ua) ||
    (ua.includes('android') && !ua.includes('mobile'))
  ) {
    return 'tablet';
  }

  // Check for mobile
  if (
    /iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/.test(ua) ||
    (ua.includes('mobile') && ua.includes('safari'))
  ) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Get timezone
 */
function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Detect hemisphere from timezone
 */
function isNorthernHemisphere(timezone: string): boolean {
  // Common southern hemisphere regions
  const southernRegions = [
    'Australia',
    'Pacific/Auckland',
    'Pacific/Fiji',
    'America/Buenos_Aires',
    'America/Sao_Paulo',
    'Africa/Johannesburg',
    'Africa/Cape_Town',
    'Antarctica',
  ];

  return !southernRegions.some((region) =>
    timezone.toLowerCase().includes(region.toLowerCase())
  );
}

/**
 * Get referrer source category
 */
function getReferrerSource(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const referrer = document.referrer;
  if (!referrer) return undefined;

  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();

    // Social media
    if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
    if (host.includes('facebook') || host.includes('fb.com')) return 'facebook';
    if (host.includes('instagram')) return 'instagram';
    if (host.includes('reddit')) return 'reddit';
    if (host.includes('linkedin')) return 'linkedin';
    if (host.includes('tiktok')) return 'tiktok';

    // Search engines
    if (host.includes('google')) return 'google';
    if (host.includes('bing')) return 'bing';
    if (host.includes('duckduckgo')) return 'duckduckgo';
    if (host.includes('yahoo')) return 'yahoo';

    // Other
    return 'external';
  } catch {
    return undefined;
  }
}

/**
 * Context Analyzer class
 */
export class ContextAnalyzer {
  private cachedContext: PersonalizationContext | null = null;
  private lastAnalysis: number = 0;
  private cacheMaxAge: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Analyze current context
   */
  analyze(): PersonalizationContext {
    const now = Date.now();

    // Return cached context if still valid
    if (
      this.cachedContext &&
      now - this.lastAnalysis < this.cacheMaxAge
    ) {
      return this.cachedContext;
    }

    const date = new Date();
    const timezone = getTimezone();
    const northern = isNorthernHemisphere(timezone);

    const context: PersonalizationContext = {
      timeOfDay: getTimeOfDay(date.getHours()),
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      season: getSeason(date.getMonth(), northern),
      timezone,
      deviceType: getDeviceType(),
      referrer: getReferrerSource(),
    };

    // Cache the context
    this.cachedContext = context;
    this.lastAnalysis = now;

    return context;
  }

  /**
   * Get time-based content preferences
   */
  getTimePreferences(): {
    preferredCategories: string[];
    contentMood: 'energetic' | 'relaxed' | 'focused' | 'entertaining';
    sessionLength: 'short' | 'medium' | 'long';
  } {
    const context = this.analyze();

    let preferredCategories: string[];
    let contentMood: 'energetic' | 'relaxed' | 'focused' | 'entertaining';
    let sessionLength: 'short' | 'medium' | 'long';

    switch (context.timeOfDay) {
      case 'morning':
        preferredCategories = ['Food', 'Technology', 'Stories', 'Sports'];
        contentMood = 'energetic';
        sessionLength = 'short';
        break;
      case 'afternoon':
        preferredCategories = ['Technology', 'Art', 'Fashion', 'Travel'];
        contentMood = 'focused';
        sessionLength = 'medium';
        break;
      case 'evening':
        preferredCategories = ['Games', 'Movies', 'Music', 'Sports'];
        contentMood = 'entertaining';
        sessionLength = 'long';
        break;
      case 'night':
        preferredCategories = ['Movies', 'Music', 'Games', 'Stories'];
        contentMood = 'relaxed';
        sessionLength = 'long';
        break;
    }

    // Adjust for weekends
    if (context.isWeekend) {
      sessionLength = 'long';
      contentMood = 'relaxed';
    }

    return { preferredCategories, contentMood, sessionLength };
  }

  /**
   * Get device-based content preferences
   */
  getDevicePreferences(): {
    preferContentLength: 'short' | 'medium' | 'long';
    preferVisualContent: boolean;
    preferInteractiveContent: boolean;
  } {
    const context = this.analyze();

    switch (context.deviceType) {
      case 'mobile':
        return {
          preferContentLength: 'short',
          preferVisualContent: true,
          preferInteractiveContent: false,
        };
      case 'tablet':
        return {
          preferContentLength: 'medium',
          preferVisualContent: true,
          preferInteractiveContent: true,
        };
      case 'desktop':
        return {
          preferContentLength: 'long',
          preferVisualContent: false,
          preferInteractiveContent: true,
        };
    }
  }

  /**
   * Get seasonal content preferences
   */
  getSeasonalPreferences(): {
    preferredCategories: string[];
    seasonalThemes: string[];
  } {
    const context = this.analyze();

    switch (context.season) {
      case 'winter':
        return {
          preferredCategories: ['Movies', 'Games', 'Food', 'Music'],
          seasonalThemes: ['cozy', 'indoor', 'holiday', 'comfort'],
        };
      case 'spring':
        return {
          preferredCategories: ['Sports', 'Travel', 'Fashion', 'Art'],
          seasonalThemes: ['fresh', 'renewal', 'outdoor', 'bloom'],
        };
      case 'summer':
        return {
          preferredCategories: ['Travel', 'Sports', 'Music', 'Food'],
          seasonalThemes: ['adventure', 'outdoor', 'festival', 'vacation'],
        };
      case 'fall':
        return {
          preferredCategories: ['Movies', 'Food', 'Art', 'Stories'],
          seasonalThemes: ['harvest', 'cozy', 'nostalgic', 'awards'],
        };
    }
  }

  /**
   * Get referrer-based preferences
   */
  getReferrerPreferences(): {
    expectedEngagement: 'low' | 'medium' | 'high';
    contentStyle: 'viral' | 'curated' | 'discovery';
  } {
    const context = this.analyze();

    switch (context.referrer) {
      case 'twitter':
      case 'reddit':
        return {
          expectedEngagement: 'medium',
          contentStyle: 'viral',
        };
      case 'google':
      case 'bing':
        return {
          expectedEngagement: 'high',
          contentStyle: 'discovery',
        };
      case 'facebook':
      case 'instagram':
        return {
          expectedEngagement: 'low',
          contentStyle: 'viral',
        };
      default:
        return {
          expectedEngagement: 'medium',
          contentStyle: 'curated',
        };
    }
  }

  /**
   * Clear cached context (useful for testing)
   */
  clearCache(): void {
    this.cachedContext = null;
    this.lastAnalysis = 0;
  }

  /**
   * Force update context
   */
  refresh(): PersonalizationContext {
    this.clearCache();
    return this.analyze();
  }
}

// Singleton instance
let analyzerInstance: ContextAnalyzer | null = null;

/**
 * Get the singleton ContextAnalyzer instance
 */
export function getContextAnalyzer(): ContextAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new ContextAnalyzer();
  }
  return analyzerInstance;
}
