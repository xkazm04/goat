import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { activityLogger } from '@/lib/logger';

export interface ActivityItem {
  id: string;
  username: string;
  listTitle: string;
  category: string;
  subcategory?: string;
  itemCount: number;
  timestamp: Date;
  avatarUrl?: string;
}

interface ActivityStoreState {
  // Activity feed state
  activities: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Polling configuration
  pollingInterval: number;
  isPolling: boolean;

  // Actions
  addActivity: (activity: ActivityItem) => void;
  setActivities: (activities: ActivityItem[]) => void;
  removeOldActivities: (maxAge: number) => void;
  clearActivities: () => void;
  initializeDemoActivities: () => void;

  // Polling actions
  startPolling: () => void;
  stopPolling: () => void;

  // API actions
  fetchRecentActivities: () => Promise<void>;

  // For broadcasting local completions
  broadcastCompletion: (listTitle: string, category: string, subcategory?: string, itemCount?: number) => void;
}

// Generate a random username for demo/anonymous users
const generateDemoUsername = (): string => {
  const adjectives = ['Swift', 'Bold', 'Epic', 'Clever', 'Mighty', 'Quick', 'Sharp', 'Cool'];
  const nouns = ['Ranker', 'Voter', 'Picker', 'Curator', 'Judge', 'Expert', 'Master', 'Pro'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
};

// Generate demo activities for initial display - only call on client
const generateDemoActivities = (): ActivityItem[] => {
  const demoLists = [
    { title: 'Top 10 NBA Players', category: 'sports', subcategory: 'basketball', itemCount: 10 },
    { title: 'Best Movies of 2024', category: 'entertainment', subcategory: 'movies', itemCount: 10 },
    { title: 'Greatest Albums Ever', category: 'music', subcategory: 'albums', itemCount: 25 },
    { title: 'Top 10 Video Games', category: 'gaming', subcategory: 'games', itemCount: 10 },
    { title: 'Best Pizza Places NYC', category: 'food', subcategory: 'restaurants', itemCount: 10 },
    { title: 'Top Soccer Players', category: 'sports', subcategory: 'soccer', itemCount: 10 },
    { title: 'Best TV Shows 2024', category: 'entertainment', subcategory: 'tv', itemCount: 10 },
    { title: 'Greatest Rappers', category: 'music', subcategory: 'artists', itemCount: 20 },
  ];

  const now = Date.now();

  return demoLists.slice(0, 5).map((list, index) => ({
    id: `demo-${now}-${index}`,
    username: generateDemoUsername(),
    listTitle: list.title,
    category: list.category,
    subcategory: list.subcategory,
    itemCount: list.itemCount,
    timestamp: new Date(now - (index * 15000 + Math.random() * 10000)), // Staggered timestamps
  }));
};

let pollingIntervalId: NodeJS.Timeout | null = null;

export const useActivityStore = create<ActivityStoreState>((set, get) => ({
  // Initial state - start empty to avoid hydration mismatch
  // Demo activities will be generated client-side via initializeDemoActivities
  activities: [],
  isLoading: false,
  error: null,
  isInitialized: false,
  pollingInterval: 10000, // 10 seconds
  isPolling: false,

  // Add a new activity to the top of the feed
  addActivity: (activity) => {
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 20), // Keep max 20 activities
    }));
  },

  // Set all activities (from API)
  setActivities: (activities) => {
    set({ activities, isLoading: false, error: null });
  },

  // Remove activities older than maxAge (in milliseconds)
  removeOldActivities: (maxAge) => {
    const now = Date.now();
    set((state) => ({
      activities: state.activities.filter(
        (activity) => now - new Date(activity.timestamp).getTime() < maxAge
      ),
    }));
  },

  // Clear all activities
  clearActivities: () => {
    set({ activities: [] });
  },

  // Initialize demo activities (call only on client-side)
  initializeDemoActivities: () => {
    const state = get();
    if (state.isInitialized) return;

    const demoActivities = generateDemoActivities();
    set({ activities: demoActivities, isInitialized: true });
  },

  // Start polling for new activities
  startPolling: () => {
    const state = get();
    if (state.isPolling || pollingIntervalId) return;

    // Initialize demo activities if not already done
    if (!state.isInitialized) {
      get().initializeDemoActivities();
    }

    set({ isPolling: true });

    // Initial fetch
    get().fetchRecentActivities();

    // Set up polling
    pollingIntervalId = setInterval(() => {
      get().fetchRecentActivities();
    }, state.pollingInterval);
  },

  // Stop polling
  stopPolling: () => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
    set({ isPolling: false });
  },

  // Fetch recent activities from API
  fetchRecentActivities: async () => {
    const state = get();
    if (state.isLoading) return;

    set({ isLoading: true });

    try {
      const response = await fetch('/api/activities?limit=10');

      if (!response.ok) {
        // If API doesn't exist yet, generate demo activities
        if (response.status === 404) {
          // Simulate new activity coming in
          const demoActivity = generateDemoActivities()[0];
          demoActivity.id = `demo-${Date.now()}`;
          demoActivity.timestamp = new Date();
          get().addActivity(demoActivity);
          set({ isLoading: false });
          return;
        }
        throw new Error('Failed to fetch activities');
      }

      const data = await response.json();

      if (data.activities && Array.isArray(data.activities)) {
        // Merge with existing activities, removing duplicates
        const existingIds = new Set(state.activities.map(a => a.id));
        const newActivities = data.activities.filter((a: ActivityItem) => !existingIds.has(a.id));

        if (newActivities.length > 0) {
          set((currentState) => ({
            activities: [...newActivities, ...currentState.activities].slice(0, 20),
            isLoading: false,
            error: null,
          }));
        } else {
          set({ isLoading: false });
        }
      }
    } catch (error) {
      activityLogger.warn('Activity feed API not available, using demo data');
      // Generate a random demo activity on failure
      const demoActivity = generateDemoActivities()[Math.floor(Math.random() * 5)];
      demoActivity.id = `demo-${Date.now()}`;
      demoActivity.timestamp = new Date();
      get().addActivity(demoActivity);
      set({ isLoading: false, error: null });
    }
  },

  // Broadcast a local completion (for when current user finishes a ranking)
  broadcastCompletion: (listTitle, category, subcategory, itemCount = 10) => {
    const activity: ActivityItem = {
      id: `local-${Date.now()}`,
      username: 'You',
      listTitle,
      category,
      subcategory,
      itemCount,
      timestamp: new Date(),
    };

    // Add to local feed immediately
    get().addActivity(activity);

    // Optionally send to backend (if API exists)
    try {
      fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listTitle,
          category,
          subcategory,
          itemCount,
        }),
      }).catch(() => {
        // Silently fail if API doesn't exist
      });
    } catch {
      // Silently fail
    }
  },
}));

// Selector hooks
export const useActivities = () => useActivityStore((state) => state.activities);
export const useActivityLoading = () => useActivityStore((state) => state.isLoading);
export const useActivityInitialized = () => useActivityStore((state) => state.isInitialized);
export const useActivityActions = () => useActivityStore(
  useShallow((state) => ({
    addActivity: state.addActivity,
    fetchRecentActivities: state.fetchRecentActivities,
    startPolling: state.startPolling,
    stopPolling: state.stopPolling,
    broadcastCompletion: state.broadcastCompletion,
    initializeDemoActivities: state.initializeDemoActivities,
  }))
);
