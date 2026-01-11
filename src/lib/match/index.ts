/**
 * Match Library
 *
 * Provides centralized state management and orchestration
 * for the match/ranking system.
 */

export {
  // Main orchestrator class
  MatchSessionOrchestrator,

  // Factory functions
  createMatchSessionOrchestrator,
  getOrchestrator,
  resetOrchestrator,

  // Types
  type OrchestratorCommand,
  type OrchestratorResult,
  type OrchestratorError,
  type AssignOptions,
  type MoveOptions,
  type SwapOptions,
  type RemoveOptions,
  type OrchestratorStores,
} from './orchestrator';

export {
  // React hook for using orchestrator
  useOrchestrator,
  type UseOrchestratorReturn,
} from './use-orchestrator';
