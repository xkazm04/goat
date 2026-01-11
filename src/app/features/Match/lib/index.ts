// Composite hooks (backward compatibility)
export { useMatchGridState, useMatchGridActions, useMatchGridSelectors } from './useMatchGridState';

// Atomic selector hooks (recommended for better performance)
export {
  // Drag-related state
  useDragState,
  // Keyboard navigation
  useKeyboardMode,
  // List information
  useListMetadata,
  // Selection state
  useGridSelection,
  // Grid items (use sparingly)
  useGridItemsState,
  // Backlog state
  useBacklogState,
  // Modal visibility
  useMatchModals,
  // Session management
  useMatchSession,
  // Grid operations
  useGridOperations,
  // Drag event handling
  useDragHandlers,
  // Grid statistics from store
  useStoreGridStatistics,
} from './useMatchGridState';
export {
  getRankConfig,
  getRankColor,
  isPodiumPosition,
  getConfettiColors,
  RANK_COLORS,
  CONFETTI_THEMES,
  type RankConfig,
} from './rankConfig';

// Re-export hooks from the hooks directory
export {
  useGridPresenter,
  useGridSlotPresenter,
  useGridStatistics,
  type GridPresentation,
  type GridSectionPresentation,
  type GridSlotPresentation,
  type GridSection,
} from '../hooks';
