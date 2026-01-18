/**
 * Showcase Selector
 * Dynamic content picker for the personalized showcase
 */

import { PersonalizationEngine, ContentItem, getPersonalizationEngine } from './PersonalizationEngine';
import { ContextAnalyzer, getContextAnalyzer } from './ContextAnalyzer';
import { InterestTracker, getInterestTracker } from './InterestTracker';
import {
  PersonalizedShowcaseItem,
  PersonalizationConfig,
  SelectionReason,
  InterestCategory,
} from './types';

/**
 * Selection strategy for showcase
 */
export type SelectionStrategy =
  | 'personalized' // Full personalization
  | 'popular' // Popularity-based (new users)
  | 'diverse' // Category diversity
  | 'contextual' // Time/location based
  | 'random'; // Random (A/B control)

/**
 * Showcase item position in layout
 */
export interface ShowcasePosition {
  slot: 'hero' | 'featured' | 'secondary' | 'discovery';
  index: number;
  prominence: number; // 0-100
}

/**
 * Selected showcase item with position
 */
export interface SelectedShowcaseItem<T> extends PersonalizedShowcaseItem<T> {
  position: ShowcasePosition;
}

/**
 * Showcase layout configuration
 */
export interface ShowcaseLayoutConfig {
  heroSlots: number;
  featuredSlots: number;
  secondarySlots: number;
  discoverySlots: number;
}

const DEFAULT_LAYOUT: ShowcaseLayoutConfig = {
  heroSlots: 1,
  featuredSlots: 3,
  secondarySlots: 6,
  discoverySlots: 4,
};

/**
 * Showcase Selector class
 */
export class ShowcaseSelector<T extends ContentItem = ContentItem> {
  private engine: PersonalizationEngine;
  private analyzer: ContextAnalyzer;
  private tracker: InterestTracker;
  private layout: ShowcaseLayoutConfig;
  private strategy: SelectionStrategy;

  constructor(
    layout: Partial<ShowcaseLayoutConfig> = {},
    config?: Partial<PersonalizationConfig>
  ) {
    this.engine = getPersonalizationEngine(config);
    this.analyzer = getContextAnalyzer();
    this.tracker = getInterestTracker();
    this.layout = { ...DEFAULT_LAYOUT, ...layout };
    this.strategy = 'personalized';
  }

  /**
   * Initialize the selector (async to allow tracker initialization)
   */
  async initialize(): Promise<void> {
    await this.tracker.initialize();

    // Set context in engine
    const context = this.analyzer.analyze();
    this.engine.setContext(context);

    // Determine strategy based on user state
    this.strategy = this.determineStrategy();
  }

  /**
   * Determine the best selection strategy
   */
  private determineStrategy(): SelectionStrategy {
    const visitCount = this.tracker.getVisitCount();
    const interests = this.tracker.getTopInterests(3);

    // New user - use popular content
    if (visitCount <= 2) {
      return 'popular';
    }

    // User with interests - personalize
    if (interests.length > 0) {
      return 'personalized';
    }

    // User without clear interests - use contextual
    return 'contextual';
  }

  /**
   * Set selection strategy manually (for A/B testing)
   */
  setStrategy(strategy: SelectionStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Select items for the showcase
   */
  selectForShowcase(items: T[]): SelectedShowcaseItem<T>[] {
    const totalSlots =
      this.layout.heroSlots +
      this.layout.featuredSlots +
      this.layout.secondarySlots +
      this.layout.discoverySlots;

    // Score items based on strategy
    const scored = this.scoreByStrategy(items);

    // Sort by relevance
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Assign positions
    const selected: SelectedShowcaseItem<T>[] = [];
    let itemIndex = 0;

    // Hero slots (highest prominence)
    for (let i = 0; i < this.layout.heroSlots && itemIndex < scored.length; i++) {
      selected.push({
        ...scored[itemIndex],
        position: { slot: 'hero', index: i, prominence: 100 },
      });
      itemIndex++;
    }

    // Featured slots (high prominence)
    for (let i = 0; i < this.layout.featuredSlots && itemIndex < scored.length; i++) {
      selected.push({
        ...scored[itemIndex],
        position: { slot: 'featured', index: i, prominence: 80 },
      });
      itemIndex++;
    }

    // Secondary slots (medium prominence)
    for (let i = 0; i < this.layout.secondarySlots && itemIndex < scored.length; i++) {
      selected.push({
        ...scored[itemIndex],
        position: { slot: 'secondary', index: i, prominence: 50 },
      });
      itemIndex++;
    }

    // Discovery slots (exploration/diversity)
    const discoveryItems = this.selectDiscoveryItems(scored, itemIndex);
    for (let i = 0; i < this.layout.discoverySlots && i < discoveryItems.length; i++) {
      selected.push({
        ...discoveryItems[i],
        position: { slot: 'discovery', index: i, prominence: 30 },
      });
    }

    return selected;
  }

  /**
   * Score items based on current strategy
   */
  private scoreByStrategy(items: T[]): PersonalizedShowcaseItem<T>[] {
    switch (this.strategy) {
      case 'personalized':
        return this.engine.scoreItems(items);

      case 'popular':
        return this.scoreByPopularity(items);

      case 'diverse':
        return this.scoreByDiversity(items);

      case 'contextual':
        return this.scoreByContext(items);

      case 'random':
        return this.scoreRandom(items);

      default:
        return this.engine.scoreItems(items);
    }
  }

  /**
   * Score by popularity (for new users)
   */
  private scoreByPopularity(items: T[]): PersonalizedShowcaseItem<T>[] {
    return items.map((item) => {
      const popularity = item.popularity || 50;
      const trending = item.trending ? 20 : 0;

      return {
        item,
        relevanceScore: Math.min(100, popularity + trending),
        selectionReason: 'popular' as SelectionReason,
        boostFactors: [
          { type: 'popularity', value: popularity, reason: 'Popular content' },
        ],
      };
    });
  }

  /**
   * Score by diversity (ensure category variety)
   */
  private scoreByDiversity(items: T[]): PersonalizedShowcaseItem<T>[] {
    const categoryCount: Record<string, number> = {};

    return items.map((item) => {
      const category = item.category;
      const count = categoryCount[category] || 0;
      categoryCount[category] = count + 1;

      // Penalize items from already-represented categories
      const diversityPenalty = count * 20;
      const baseScore = item.popularity || 50;

      return {
        item,
        relevanceScore: Math.max(10, baseScore - diversityPenalty),
        selectionReason: 'exploration' as SelectionReason,
        boostFactors: [
          { type: 'diversity', value: -diversityPenalty, reason: 'Category diversity' },
        ],
      };
    });
  }

  /**
   * Score by context (time/location)
   */
  private scoreByContext(items: T[]): PersonalizedShowcaseItem<T>[] {
    const timePrefs = this.analyzer.getTimePreferences();
    const seasonPrefs = this.analyzer.getSeasonalPreferences();
    const preferredCategories = Array.from(
      new Set([...timePrefs.preferredCategories, ...seasonPrefs.preferredCategories])
    );

    return items.map((item) => {
      let score = 50;
      const boostFactors = [];

      if (preferredCategories.includes(item.category)) {
        score += 30;
        boostFactors.push({
          type: 'contextual',
          value: 30,
          reason: 'Time-appropriate content',
        });
      }

      if (item.trending) {
        score += 15;
        boostFactors.push({
          type: 'trending',
          value: 15,
          reason: 'Currently trending',
        });
      }

      return {
        item,
        relevanceScore: Math.min(100, score),
        selectionReason: 'contextual' as SelectionReason,
        boostFactors,
      };
    });
  }

  /**
   * Random scoring (for A/B testing control)
   */
  private scoreRandom(items: T[]): PersonalizedShowcaseItem<T>[] {
    return items.map((item) => ({
      item,
      relevanceScore: Math.random() * 100,
      selectionReason: 'default' as SelectionReason,
      boostFactors: [{ type: 'random', value: 0, reason: 'Random selection' }],
    }));
  }

  /**
   * Select items for discovery slots (different from main selection)
   */
  private selectDiscoveryItems(
    scored: PersonalizedShowcaseItem<T>[],
    startIndex: number
  ): PersonalizedShowcaseItem<T>[] {
    const topInterests = this.tracker.getTopInterests(3);
    const topCategories = topInterests.map((i) => i.category);

    // Find items from underrepresented categories
    const remaining = scored.slice(startIndex);
    const discoveryItems = remaining.filter(
      (item) => !topCategories.includes(item.item.category as InterestCategory)
    );

    // If not enough discovery items, use remaining items
    if (discoveryItems.length < this.layout.discoverySlots) {
      return remaining.slice(0, this.layout.discoverySlots);
    }

    // Shuffle for variety
    return discoveryItems.sort(() => Math.random() - 0.5);
  }

  /**
   * Get items for a specific slot type
   */
  getSlotItems(
    selected: SelectedShowcaseItem<T>[],
    slot: ShowcasePosition['slot']
  ): SelectedShowcaseItem<T>[] {
    return selected
      .filter((item) => item.position.slot === slot)
      .sort((a, b) => a.position.index - b.position.index);
  }

  /**
   * Get hero item
   */
  getHeroItem(selected: SelectedShowcaseItem<T>[]): SelectedShowcaseItem<T> | null {
    const heroes = this.getSlotItems(selected, 'hero');
    return heroes[0] || null;
  }

  /**
   * Get featured items
   */
  getFeaturedItems(selected: SelectedShowcaseItem<T>[]): SelectedShowcaseItem<T>[] {
    return this.getSlotItems(selected, 'featured');
  }

  /**
   * Get discovery items
   */
  getDiscoveryItems(selected: SelectedShowcaseItem<T>[]): SelectedShowcaseItem<T>[] {
    return this.getSlotItems(selected, 'discovery');
  }

  /**
   * Track that a showcase item was viewed
   */
  async trackView(item: T, duration?: number): Promise<void> {
    await this.tracker.trackEvent({
      type: 'view',
      category: item.category,
      subcategory: item.subcategory,
      itemId: String(item.id),
      duration,
    });
  }

  /**
   * Track that a showcase item was clicked
   */
  async trackClick(item: T): Promise<void> {
    await this.tracker.trackEvent({
      type: 'click',
      category: item.category,
      subcategory: item.subcategory,
      itemId: String(item.id),
    });
  }

  /**
   * Get current strategy
   */
  getStrategy(): SelectionStrategy {
    return this.strategy;
  }

  /**
   * Get layout configuration
   */
  getLayout(): ShowcaseLayoutConfig {
    return { ...this.layout };
  }

  /**
   * Update layout configuration
   */
  updateLayout(layout: Partial<ShowcaseLayoutConfig>): void {
    this.layout = { ...this.layout, ...layout };
  }
}

// Factory function
export function createShowcaseSelector<T extends ContentItem>(
  layout?: Partial<ShowcaseLayoutConfig>,
  config?: Partial<PersonalizationConfig>
): ShowcaseSelector<T> {
  return new ShowcaseSelector<T>(layout, config);
}
