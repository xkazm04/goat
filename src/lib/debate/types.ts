/**
 * AI Debate Mode Types
 *
 * Type definitions for the LLM-powered ranking debate system.
 * When a user places an item in a tier, the AI can challenge the placement
 * with arguments, statistics, and cultural context.
 */

/**
 * A single debate argument from either the AI or the user
 */
export interface DebateMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: number;
  /** AI confidence in its argument (0-1) */
  confidence?: number;
  /** Whether this message contains a challenge to the placement */
  isChallenge?: boolean;
}

/**
 * Request to generate a debate challenge
 */
export interface DebateChallengeRequest {
  /** The item being placed */
  itemName: string;
  /** Category context (e.g., "NBA Players", "Movies") */
  category: string;
  subcategory?: string;
  /** The tier the user placed the item in */
  userTier: string;
  /** The position within that tier (1-based) */
  userPosition: number;
  /** Total items in the list */
  listSize: number;
  /** Optional: other items in the same tier for context */
  tiermates?: string[];
  /** Optional: items ranked above this item */
  rankedAbove?: string[];
  /** Optional: items ranked below this item */
  rankedBelow?: string[];
  /** Previous messages in the debate thread */
  history?: DebateMessage[];
  /** Consensus data if available */
  consensusData?: {
    averagePosition: number;
    controversyScore: number;
    sampleSize: number;
  };
}

/**
 * Response from the AI debate system
 */
export interface DebateChallengeResponse {
  /** The main argument text */
  argument: string;
  /** How strongly the AI disagrees (0 = agrees, 100 = strongly disagrees) */
  challengeStrength: number;
  /** Where the AI thinks the item should be placed */
  suggestedTier?: string;
  suggestedPosition?: number;
  /** Key facts supporting the argument */
  keyFacts?: string[];
  /** Controversy score based on community + AI analysis */
  controversyScore: number;
  /** Whether this is a "hot take" that would be shareable */
  isHotTake: boolean;
  /** Error if the request failed */
  error?: string;
}

/**
 * A debate thread for a specific item placement
 */
export interface DebateThread {
  id: string;
  itemId: string;
  itemName: string;
  tier: string;
  position: number;
  messages: DebateMessage[];
  challengeStrength: number;
  controversyScore: number;
  isHotTake: boolean;
  status: 'idle' | 'loading' | 'active' | 'resolved';
  /** Whether the user accepted the AI's suggestion */
  resolution?: 'accepted' | 'dismissed' | 'debated';
  createdAt: number;
  updatedAt: number;
}

/**
 * Controversy badge for an item
 */
export interface ControversyInfo {
  itemId: string;
  score: number; // 0-100
  level: 'none' | 'mild' | 'moderate' | 'hot' | 'volcanic';
  label: string;
  hasDebate: boolean;
}

/**
 * Debate store state
 */
export interface DebateState {
  /** Active debate threads keyed by item ID */
  threads: Record<string, DebateThread>;
  /** Currently open debate thread ID */
  activeThreadId: string | null;
  /** Whether debate mode is enabled */
  enabled: boolean;
  /** Whether the debate panel is open */
  panelOpen: boolean;
  /** Global loading state */
  isLoading: boolean;
}

/**
 * Debate store actions
 */
export interface DebateActions {
  /** Toggle debate mode on/off */
  setEnabled: (enabled: boolean) => void;
  /** Open/close the debate panel */
  setPanelOpen: (open: boolean) => void;
  /** Start a new debate for an item placement */
  startDebate: (
    itemId: string,
    itemName: string,
    tier: string,
    position: number,
  ) => void;
  /** Set the active thread */
  setActiveThread: (threadId: string | null) => void;
  /** Add an AI response to a thread */
  addAIMessage: (threadId: string, response: DebateChallengeResponse) => void;
  /** Add a user reply to a thread */
  addUserMessage: (threadId: string, content: string) => void;
  /** Resolve a debate (accept or dismiss) */
  resolveDebate: (threadId: string, resolution: 'accepted' | 'dismissed' | 'debated') => void;
  /** Set loading state for a thread */
  setThreadLoading: (threadId: string, loading: boolean) => void;
  /** Clear all debates */
  clearAll: () => void;
}

/**
 * Get controversy level from score
 */
export function getControversyLevel(score: number): ControversyInfo['level'] {
  if (score >= 80) return 'volcanic';
  if (score >= 60) return 'hot';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'mild';
  return 'none';
}

/**
 * Get controversy label from level
 */
export function getControversyLabel(level: ControversyInfo['level']): string {
  switch (level) {
    case 'volcanic': return 'Volcanic Take';
    case 'hot': return 'Hot Take';
    case 'moderate': return 'Debatable';
    case 'mild': return 'Mild Take';
    case 'none': return 'Consensus';
  }
}
