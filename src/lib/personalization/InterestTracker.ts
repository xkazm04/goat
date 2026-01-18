/**
 * Interest Tracker
 * Tracks user interests and behavior using IndexedDB for persistent storage
 */

import {
  UserProfile,
  BehaviorEvent,
  CategoryInterest,
  BehaviorEventType,
  STORAGE_KEYS,
  EVENT_WEIGHTS,
  INTEREST_DECAY,
  DEFAULT_USER_PREFERENCES,
} from './types';

const DB_NAME = 'goat_personalization';
const DB_VERSION = 1;
const STORE_NAME = 'user_data';

/**
 * Generate a unique anonymous user ID
 */
function generateUserId(): string {
  return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get or create IndexedDB database
 */
async function getDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Store data in IndexedDB
 */
async function storeData<T>(key: string, value: T): Promise<void> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ key, value, updatedAt: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Retrieve data from IndexedDB
 */
async function getData<T>(key: string): Promise<T | null> {
  const db = await getDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
  });
}

/**
 * Interest Tracker class
 * Manages user profile and interest tracking
 */
export class InterestTracker {
  private profile: UserProfile | null = null;
  private initialized = false;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize the tracker and load existing profile
   */
  async initialize(): Promise<UserProfile> {
    if (this.initialized && this.profile) {
      return this.profile;
    }

    try {
      // Try to load existing profile
      const existingProfile = await getData<UserProfile>(STORAGE_KEYS.USER_PROFILE);

      if (existingProfile) {
        // Update visit info
        this.profile = {
          ...existingProfile,
          lastVisit: Date.now(),
          visitCount: existingProfile.visitCount + 1,
          isNewUser: false,
        };

        // Apply interest decay
        this.applyInterestDecay();
      } else {
        // Create new profile
        this.profile = this.createNewProfile();
      }

      // Save updated profile
      await this.saveProfile();
      this.initialized = true;

      return this.profile;
    } catch (error) {
      console.warn('Failed to initialize InterestTracker, using in-memory fallback:', error);
      this.profile = this.createNewProfile();
      this.initialized = true;
      return this.profile;
    }
  }

  /**
   * Create a new user profile
   */
  private createNewProfile(): UserProfile {
    const now = Date.now();
    return {
      id: generateUserId(),
      isAuthenticated: false,
      isNewUser: true,
      firstVisit: now,
      lastVisit: now,
      visitCount: 1,
      interests: [],
      recentEvents: [],
      preferredTimePeriods: ['all-time'],
      experiments: {},
      preferences: { ...DEFAULT_USER_PREFERENCES },
    };
  }

  /**
   * Apply interest decay based on time since last interaction
   */
  private applyInterestDecay(): void {
    if (!this.profile) return;

    const now = Date.now();
    const decayFactor = Math.log(2) / (INTEREST_DECAY.halfLifeDays * 24 * 60 * 60 * 1000);

    this.profile.interests = this.profile.interests
      .map((interest) => {
        const timeSinceInteraction = now - interest.lastInteraction;
        const decay = Math.exp(-decayFactor * timeSinceInteraction);
        const newScore = interest.score * decay;

        // Apply decay to subcategories too
        const decayedSubcategories: Record<string, number> = {};
        for (const [sub, score] of Object.entries(interest.subcategories)) {
          const decayedScore = score * decay;
          if (decayedScore >= INTEREST_DECAY.minScore) {
            decayedSubcategories[sub] = decayedScore;
          }
        }

        return {
          ...interest,
          score: newScore,
          subcategories: decayedSubcategories,
        };
      })
      .filter((interest) => interest.score >= INTEREST_DECAY.minScore);
  }

  /**
   * Track a behavior event
   */
  async trackEvent(event: Omit<BehaviorEvent, 'timestamp'>): Promise<void> {
    if (!this.profile) {
      await this.initialize();
    }

    const fullEvent: BehaviorEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // Add to recent events (keep last 100)
    this.profile!.recentEvents = [
      fullEvent,
      ...this.profile!.recentEvents.slice(0, 99),
    ];

    // Update interest scores
    this.updateInterests(fullEvent);

    // Debounced save
    this.debouncedSave();
  }

  /**
   * Update interest scores based on event
   */
  private updateInterests(event: BehaviorEvent): void {
    if (!this.profile) return;

    const weight = EVENT_WEIGHTS[event.type] || 1;
    const scoreIncrease = weight * (event.duration ? Math.min(event.duration / 1000, 10) : 1);

    // Find or create category interest
    let interest = this.profile.interests.find((i) => i.category === event.category);

    if (!interest) {
      interest = {
        category: event.category as any,
        score: 0,
        interactions: 0,
        lastInteraction: Date.now(),
        subcategories: {},
      };
      this.profile.interests.push(interest);
    }

    // Update scores
    interest.score = Math.min(interest.score + scoreIncrease, INTEREST_DECAY.maxScore);
    interest.interactions += 1;
    interest.lastInteraction = Date.now();

    // Update subcategory if present
    if (event.subcategory) {
      const currentSubScore = interest.subcategories[event.subcategory] || 0;
      interest.subcategories[event.subcategory] = Math.min(
        currentSubScore + scoreIncrease,
        INTEREST_DECAY.maxScore
      );
    }

    // Sort interests by score
    this.profile.interests.sort((a, b) => b.score - a.score);
  }

  /**
   * Debounced save to reduce writes
   */
  private debouncedSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.saveProfile();
    }, 1000);
  }

  /**
   * Save profile to storage
   */
  async saveProfile(): Promise<void> {
    if (!this.profile) return;

    try {
      await storeData(STORAGE_KEYS.USER_PROFILE, this.profile);
    } catch (error) {
      console.warn('Failed to save profile:', error);
    }
  }

  /**
   * Get current profile
   */
  getProfile(): UserProfile | null {
    return this.profile;
  }

  /**
   * Get top interests (sorted by score)
   */
  getTopInterests(limit = 5): CategoryInterest[] {
    if (!this.profile) return [];
    return this.profile.interests.slice(0, limit);
  }

  /**
   * Get interest score for a specific category
   */
  getCategoryScore(category: string): number {
    if (!this.profile) return 0;
    const interest = this.profile.interests.find((i) => i.category === category);
    return interest?.score || 0;
  }

  /**
   * Get subcategory score
   */
  getSubcategoryScore(category: string, subcategory: string): number {
    if (!this.profile) return 0;
    const interest = this.profile.interests.find((i) => i.category === category);
    return interest?.subcategories[subcategory] || 0;
  }

  /**
   * Check if user is new (first or second visit)
   */
  isNewUser(): boolean {
    return this.profile?.isNewUser || (this.profile?.visitCount || 0) <= 2;
  }

  /**
   * Get visit count
   */
  getVisitCount(): number {
    return this.profile?.visitCount || 0;
  }

  /**
   * Set A/B test assignment
   */
  setExperiment(experimentId: string, variantId: string): void {
    if (!this.profile) return;
    this.profile.experiments[experimentId] = variantId;
    this.debouncedSave();
  }

  /**
   * Get A/B test assignment
   */
  getExperiment(experimentId: string): string | undefined {
    return this.profile?.experiments[experimentId];
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UserProfile['preferences']>): void {
    if (!this.profile) return;
    this.profile.preferences = {
      ...this.profile.preferences,
      ...preferences,
    };
    this.debouncedSave();
  }

  /**
   * Link authenticated user
   */
  async linkAuthenticatedUser(userId: string): Promise<void> {
    if (!this.profile) {
      await this.initialize();
    }

    this.profile!.id = userId;
    this.profile!.isAuthenticated = true;
    await this.saveProfile();
  }

  /**
   * Clear all data (for privacy/logout)
   */
  async clearData(): Promise<void> {
    this.profile = null;
    this.initialized = false;

    try {
      const db = await getDatabase();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();
    } catch (error) {
      console.warn('Failed to clear data:', error);
    }
  }
}

// Singleton instance
let trackerInstance: InterestTracker | null = null;

/**
 * Get the singleton InterestTracker instance
 */
export function getInterestTracker(): InterestTracker {
  if (!trackerInstance) {
    trackerInstance = new InterestTracker();
  }
  return trackerInstance;
}
