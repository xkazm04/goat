/**
 * AI Debate Mode
 *
 * LLM-powered ranking debate system that challenges user placements
 * with real-world data, statistics, and cultural arguments.
 */

export type {
  DebateMessage,
  DebateChallengeRequest,
  DebateChallengeResponse,
  DebateThread,
  ControversyInfo,
  DebateState,
  DebateActions,
} from './types';

export {
  getControversyLevel,
  getControversyLabel,
} from './types';
