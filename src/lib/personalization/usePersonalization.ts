/**
 * Personalization Hook
 * React hook for using the personalization system
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getInterestTracker, InterestTracker } from './InterestTracker';
import { getPersonalizationEngine, PersonalizationEngine, ContentItem } from './PersonalizationEngine';
import { getContextAnalyzer, ContextAnalyzer } from './ContextAnalyzer';
import {
  UserProfile,
  PersonalizedShowcaseItem,
  PersonalizationContext,
  BehaviorEventType,
  CategoryInterest,
} from './types';

/**
 * Hook return type
 */
interface UsePersonalizationReturn {
  /** Whether the system is initialized */
  isInitialized: boolean;
  /** Whether personalization is active (enough visits) */
  isPersonalized: boolean;
  /** Current user profile */
  profile: UserProfile | null;
  /** Current context */
  context: PersonalizationContext | null;
  /** Top user interests */
  topInterests: CategoryInterest[];
  /** Whether user is new */
  isNewUser: boolean;
  /** Visit count */
  visitCount: number;
  /** Score and sort items */
  personalizeItems: <T extends ContentItem>(items: T[]) => PersonalizedShowcaseItem<T>[];
  /** Track a view event */
  trackView: (category: string, itemId?: string, duration?: number) => void;
  /** Track a click event */
  trackClick: (category: string, itemId?: string) => void;
  /** Track any event */
  trackEvent: (type: BehaviorEventType, category: string, metadata?: Record<string, unknown>) => void;
}

/**
 * Main personalization hook
 */
export function usePersonalization(): UsePersonalizationReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [context, setContext] = useState<PersonalizationContext | null>(null);

  const trackerRef = useRef<InterestTracker | null>(null);
  const engineRef = useRef<PersonalizationEngine | null>(null);
  const analyzerRef = useRef<ContextAnalyzer | null>(null);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        // Get singletons
        trackerRef.current = getInterestTracker();
        engineRef.current = getPersonalizationEngine();
        analyzerRef.current = getContextAnalyzer();

        // Initialize tracker and get profile
        const userProfile = await trackerRef.current.initialize();
        setProfile(userProfile);

        // Analyze context
        const currentContext = analyzerRef.current.analyze();
        setContext(currentContext);

        // Set context in engine
        engineRef.current.setContext(currentContext);

        setIsInitialized(true);
      } catch (error) {
        console.warn('Failed to initialize personalization:', error);
        setIsInitialized(true); // Still mark as initialized to avoid blocking
      }
    };

    init();
  }, []);

  // Derived state
  const isPersonalized = useMemo(() => {
    if (!profile) return false;
    return profile.visitCount >= 2 && profile.interests.length > 0;
  }, [profile]);

  const topInterests = useMemo(() => {
    return trackerRef.current?.getTopInterests(5) || [];
  }, [profile]);

  const isNewUser = useMemo(() => {
    return trackerRef.current?.isNewUser() || true;
  }, [profile]);

  const visitCount = useMemo(() => {
    return profile?.visitCount || 0;
  }, [profile]);

  // Personalize items
  const personalizeItems = useCallback(
    <T extends ContentItem>(items: T[]): PersonalizedShowcaseItem<T>[] => {
      if (!engineRef.current || !isInitialized) {
        // Return items with default scores
        return items.map((item) => ({
          item,
          relevanceScore: 50,
          selectionReason: 'default' as const,
          boostFactors: [],
        }));
      }

      return engineRef.current.scoreItems(items);
    },
    [isInitialized]
  );

  // Track view event
  const trackView = useCallback(
    (category: string, itemId?: string, duration?: number) => {
      if (!trackerRef.current) return;

      trackerRef.current.trackEvent({
        type: 'view',
        category,
        itemId,
        duration,
      });

      // Update profile state
      setProfile(trackerRef.current.getProfile());
    },
    []
  );

  // Track click event
  const trackClick = useCallback(
    (category: string, itemId?: string) => {
      if (!trackerRef.current) return;

      trackerRef.current.trackEvent({
        type: 'click',
        category,
        itemId,
      });

      // Update profile state
      setProfile(trackerRef.current.getProfile());
    },
    []
  );

  // Track any event
  const trackEvent = useCallback(
    (type: BehaviorEventType, category: string, metadata?: Record<string, unknown>) => {
      if (!trackerRef.current) return;

      trackerRef.current.trackEvent({
        type,
        category,
        metadata,
      });

      // Update profile state
      setProfile(trackerRef.current.getProfile());
    },
    []
  );

  return {
    isInitialized,
    isPersonalized,
    profile,
    context,
    topInterests,
    isNewUser,
    visitCount,
    personalizeItems,
    trackView,
    trackClick,
    trackEvent,
  };
}

/**
 * Hook for tracking showcase item views
 */
export function useTrackShowcaseView(
  category: string,
  itemId: string,
  isVisible: boolean
) {
  const startTimeRef = useRef<number | null>(null);
  const trackerRef = useRef<InterestTracker | null>(null);

  useEffect(() => {
    trackerRef.current = getInterestTracker();
  }, []);

  useEffect(() => {
    if (isVisible) {
      // Start timing
      startTimeRef.current = Date.now();
    } else if (startTimeRef.current && trackerRef.current) {
      // Stop timing and track
      const duration = Date.now() - startTimeRef.current;
      trackerRef.current.trackEvent({
        type: 'view',
        category,
        itemId,
        duration,
      });
      startTimeRef.current = null;
    }

    return () => {
      // Track on unmount if was viewing
      if (startTimeRef.current && trackerRef.current) {
        const duration = Date.now() - startTimeRef.current;
        trackerRef.current.trackEvent({
          type: 'view',
          category,
          itemId,
          duration,
        });
      }
    };
  }, [isVisible, category, itemId]);
}

/**
 * Hook for getting personalized welcome message
 */
export function usePersonalizedWelcome(): {
  greeting: string;
  subtitle: string;
  isReturningUser: boolean;
} {
  const { isInitialized, isNewUser, visitCount, topInterests, context } = usePersonalization();

  return useMemo(() => {
    if (!isInitialized) {
      return {
        greeting: 'Welcome',
        subtitle: 'Discover and rank the greatest of all time',
        isReturningUser: false,
      };
    }

    // Time-based greeting
    let timeGreeting = 'Welcome';
    if (context?.timeOfDay === 'morning') timeGreeting = 'Good morning';
    else if (context?.timeOfDay === 'afternoon') timeGreeting = 'Good afternoon';
    else if (context?.timeOfDay === 'evening') timeGreeting = 'Good evening';
    else if (context?.timeOfDay === 'night') timeGreeting = 'Welcome back';

    // Personalized subtitle
    let subtitle = 'Discover and rank the greatest of all time';

    if (!isNewUser && topInterests.length > 0) {
      const topCategory = topInterests[0].category;
      subtitle = `We've got fresh ${topCategory} rankings waiting for you`;
    } else if (visitCount === 2) {
      subtitle = 'Ready to continue exploring?';
    } else if (visitCount > 5) {
      subtitle = 'Your personalized picks are ready';
    }

    return {
      greeting: timeGreeting,
      subtitle,
      isReturningUser: !isNewUser,
    };
  }, [isInitialized, isNewUser, visitCount, topInterests, context]);
}

/**
 * Hook for getting user's preferred categories
 */
export function usePreferredCategories(limit: number = 5): string[] {
  const { topInterests } = usePersonalization();

  return useMemo(() => {
    return topInterests.slice(0, limit).map((interest) => interest.category);
  }, [topInterests, limit]);
}
