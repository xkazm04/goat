import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { useSessionStore } from './session-store';
import { useGridStore } from './grid-store';
import { useComparisonStore } from './comparison-store';
import { useListStore } from './use-list-store';
import { useValidationNotificationStore } from './validation-notification-store';
import { usePlacementStore, SmartFillMode } from './placement-store';
import { useSelectionCursor } from './selection-cursor';
import { useUndoStore } from './undo-store';
import { ValidationErrorCode } from '@/lib/validation';
import { matchLogger } from '@/lib/logger';
import { BacklogItem } from '@/types/backlog-groups';
import { DEBOUNCE, TIMEOUT, withTimeout, TimeoutError } from '@/lib/timing';

// Re-export ValidationNotification type from the dedicated store for backwards compatibility
export type { ValidationNotification } from './validation-notification-store';
// Re-export for backwards compatibility
export type { ValidationErrorCode as TransferValidationErrorCode } from '@/lib/validation';

interface MatchStoreState {
  // Match-specific UI state
  isLoading: boolean;
  isInitializing: boolean;
  backlogError: string | null;
  showComparisonModal: boolean;
  showResultShareModal: boolean;
  showSmartFillPanel: boolean;

  // Keyboard shortcuts state
  keyboardMode: boolean;

  // Actions - UI State
  setIsLoading: (loading: boolean) => void;
  setShowComparisonModal: (show: boolean) => void;
  setShowResultShareModal: (show: boolean) => void;
  setKeyboardMode: (enabled: boolean) => void;
  setShowSmartFillPanel: (show: boolean) => void;

  // Actions - Validation Notifications (delegates to validation-notification-store)
  emitValidationError: (errorCode: ValidationErrorCode) => void;

  // Actions - Keyboard Navigation
  navigateBacklogItems: (direction: 'up' | 'down') => void;
  selectNextAvailableItem: () => void;

  // Actions - Quick Assign (1-9, 0 for positions 1-10)
  quickAssignToPosition: (position: number) => void;
  quickAssignSelected: () => void;

  // Actions - Smart Placement
  startSmartFill: () => void;
  stopSmartFill: () => void;
  toggleSmartFill: () => void;
  smartPlaceItem: (item: BacklogItem, position: number) => void;
  smartPlaceToSuggested: () => void;

  // Actions - Match Session Management
  initializeMatchSession: () => Promise<void>;
  resetMatchSession: () => void;
  saveMatchProgress: () => void;

  // Actions - Keyboard Shortcuts Integration
  handleKeyboardShortcut: (key: string) => void;

  // Utilities
  getSelectedBacklogItem: () => BacklogItem | null;
  getKeyboardNavigationState: () => {
    selectedIndex: number;
    totalItems: number;
    selectedItem: BacklogItem | null;
  };
  getSmartFillMode: () => SmartFillMode;
}

export const useMatchStore = create<MatchStoreState>((set, get) => ({
  // UI State
  isLoading: false,
  isInitializing: false,
  backlogError: null,
  showComparisonModal: false,
  showResultShareModal: false,
  showSmartFillPanel: false,
  keyboardMode: false,

  // UI Actions
  setIsLoading: (loading) => set({ isLoading: loading }),
  setShowComparisonModal: (show) => {
    set({ showComparisonModal: show });

    // Sync with comparison store
    const comparisonStore = useComparisonStore.getState();
    if (show && !comparisonStore.isOpen) {
      comparisonStore.open();
    } else if (!show && comparisonStore.isOpen) {
      comparisonStore.close();
    }
  },

  setShowResultShareModal: (show) => set({ showResultShareModal: show }),

  setShowSmartFillPanel: (show) => set({ showSmartFillPanel: show }),

  // Validation Notification Actions - Delegates to validation-notification-store
  emitValidationError: (errorCode) => {
    // Delegate to the dedicated validation notification store
    useValidationNotificationStore.getState().emitValidationError(errorCode);
  },

  setKeyboardMode: (enabled) => {
    set({ keyboardMode: enabled });

    if (enabled) {
      // Reset selection when entering keyboard mode
      get().selectNextAvailableItem();
    } else {
      // Clear selection atomically via cursor
      useSelectionCursor.getState().clear();
    }
  },
  
  // Keyboard Navigation — delegates to SelectionCursor.selectNext/selectPrev
  navigateBacklogItems: (direction) => {
    if (!get().keyboardMode) return;

    const availableItems = useSessionStore.getState().getAvailableBacklogItems();
    const cursor = useSelectionCursor.getState();

    if (direction === 'down') {
      cursor.selectNext(availableItems, 'keyboard');
    } else {
      cursor.selectPrev(availableItems, 'keyboard');
    }
  },
  
  selectNextAvailableItem: () => {
    const sessionStore = useSessionStore.getState();
    const availableItems = sessionStore.getAvailableBacklogItems();

    if (availableItems.length > 0) {
      useSelectionCursor.getState().select(availableItems[0].id, 'auto');
    }
  },
  
  // Quick Assign Functions
  quickAssignToPosition: (position) => {
    const state = get();
    const sessionStore = useSessionStore.getState();
    const gridStore = useGridStore.getState();
    const cursor = useSelectionCursor.getState();

    const selectedItemId = cursor.itemId;
    if (!selectedItemId) return;
    
    // Find the selected backlog item
    const backlogItem = sessionStore.getAvailableBacklogItems()
      .find(item => item.id === selectedItemId);
    
    const gridPosition = position - 1; // Convert 1-10 to 0-9
    
    if (backlogItem && gridStore.canAddAtPosition(gridPosition)) {
      gridStore.assignItemToGrid(backlogItem, gridPosition);

      // In keyboard mode, automatically select next available item
      if (state.keyboardMode) {
        setTimeout(() => {
          get().selectNextAvailableItem();
        }, DEBOUNCE.UI_FEEDBACK);
      }
    }
  },
  
  quickAssignSelected: () => {
    const gridStore = useGridStore.getState();
    const nextPosition = gridStore.getNextAvailableGridPosition();

    if (nextPosition !== null) {
      get().quickAssignToPosition(nextPosition + 1); // Convert 0-based to 1-based
    }
  },

  // Smart Placement Actions
  startSmartFill: () => {
    const sessionStore = useSessionStore.getState();
    const placementStore = usePlacementStore.getState();
    const availableItems = sessionStore.getAvailableBacklogItems();

    placementStore.startSmartFill(availableItems);
    set({ showSmartFillPanel: true });
    matchLogger.debug('Smart fill mode started');
  },

  stopSmartFill: () => {
    const placementStore = usePlacementStore.getState();
    placementStore.stopSmartFill();
    set({ showSmartFillPanel: false });
    matchLogger.debug('Smart fill mode stopped');
  },

  toggleSmartFill: () => {
    const placementStore = usePlacementStore.getState();
    if (placementStore.smartFillMode === 'off') {
      get().startSmartFill();
    } else {
      get().stopSmartFill();
    }
  },

  smartPlaceItem: (item, position) => {
    const gridStore = useGridStore.getState();
    const placementStore = usePlacementStore.getState();

    // Place the item
    gridStore.assignItemToGrid(item, position);

    // Record placement for learning
    placementStore.recordPlacement(item, position);

    // Advance smart fill if active
    if (placementStore.smartFillMode === 'active') {
      placementStore.advanceSmartFill();
    }

    matchLogger.debug(`Smart placed item ${item.id} at position ${position}`);
  },

  smartPlaceToSuggested: () => {
    const state = get();
    const placementStore = usePlacementStore.getState();
    const sessionStore = useSessionStore.getState();
    const cursor = useSelectionCursor.getState();

    // Get the current item and top suggestion
    const selectedItemId = cursor.itemId;
    if (!selectedItemId) return;

    const backlogItem = sessionStore.getAvailableBacklogItems()
      .find(item => item.id === selectedItemId);

    if (!backlogItem) return;

    const topSuggestion = placementStore.currentPrediction?.topSuggestion;
    if (topSuggestion) {
      state.smartPlaceItem(backlogItem, topSuggestion.position);
    }
  },

  // Match Session Management
  initializeMatchSession: async () => {
    // Guard against concurrent calls (e.g. double-click on Play)
    if (get().isInitializing) {
      matchLogger.warn('initializeMatchSession already in progress, skipping concurrent call');
      return;
    }

    set({ isLoading: true, isInitializing: true, backlogError: null });

    try {
      const listStore = useListStore.getState();
      const sessionStore = useSessionStore.getState();
      const gridStore = useGridStore.getState();
      const currentList = listStore.currentList;

      if (!currentList) {
        matchLogger.warn('No current list available for match session');
        set({ isLoading: false });
        return;
      }

      matchLogger.debug(`Initializing match session for list: ${currentList.title} (${currentList.id})`);

      // 1. Sync with session store first
      sessionStore.syncWithList(currentList.id, currentList.category);

      // 2. Initialize or load grid
      const activeSession = sessionStore.getActiveSession();

      if (activeSession && activeSession.gridItems.length > 0) {
        // Load existing session
        matchLogger.debug('Loading existing session data');
        gridStore.loadFromSession(activeSession.gridItems, currentList.size);
      } else {
        // Create new grid
        matchLogger.debug('Creating new grid');
        gridStore.initializeGrid(currentList.size, currentList.id, currentList.category);
      }

      // 3. Trigger backlog loading if groups are not already loaded
      // This is critical: without this, backlog items never appear in the collection panel
      try {
        const { useBacklogStore } = await withTimeout(
          import('@/stores/backlog-store'),
          TIMEOUT.BACKLOG_INIT,
          'backlog-store-import',
        );
        const backlogState = useBacklogStore.getState();

        if (!backlogState.groups || backlogState.groups.length === 0) {
          matchLogger.debug(`Loading backlog groups for category: ${currentList.category}`);
          await withTimeout(
            backlogState.initializeGroups(
              currentList.category,
              currentList.subcategory,
              false // don't force refresh if cache is valid
            ),
            TIMEOUT.BACKLOG_INIT,
            'backlog-initialize-groups',
          );
          matchLogger.debug('Backlog groups loaded successfully');
        } else {
          matchLogger.debug(`Backlog already has ${backlogState.groups.length} groups loaded`);
        }
      } catch (backlogError) {
        const isTimeout = backlogError instanceof TimeoutError;
        matchLogger.error(
          isTimeout ? `Backlog loading timed out (${(backlogError as TimeoutError).operation})` : 'Failed to load backlog groups:',
          backlogError,
        );
        const errorMessage = isTimeout
          ? 'Backlog loading timed out. Please try again.'
          : backlogError instanceof Error
            ? backlogError.message
            : 'Failed to load backlog items. Please try refreshing the page.';
        set({ backlogError: errorMessage });
        // Non-fatal: session and grid are still initialized, user can retry
      }

      // 4. Setup keyboard mode if needed
      const state = get();
      if (state.keyboardMode) {
        get().selectNextAvailableItem();
      }

      matchLogger.info('Match session initialized successfully');

    } catch (error) {
      matchLogger.error('Failed to initialize match session:', error);
      set({
        backlogError: error instanceof Error
          ? error.message
          : 'Failed to initialize match session. Please try refreshing the page.',
      });
    } finally {
      set({ isLoading: false, isInitializing: false });
    }
  },
  
  resetMatchSession: () => {
    const gridStore = useGridStore.getState();
    const comparisonStore = useComparisonStore.getState();

    // Clear all stores
    gridStore.clearGrid();
    comparisonStore.clearAll();
    useSelectionCursor.getState().clear();
    useUndoStore.getState().clear();

    // Reset match store state
    set({
      showComparisonModal: false,
      showResultShareModal: false,
      keyboardMode: false,
    });

    matchLogger.debug('Match session reset');
  },
  
  saveMatchProgress: () => {
    const sessionStore = useSessionStore.getState();
    sessionStore.saveCurrentSession();
    
    matchLogger.debug('Match progress saved');
  },
  
  // Keyboard Shortcuts Handler
  handleKeyboardShortcut: (key) => {
    const state = get();

    // Block shortcuts during loading or when modals are open
    // Allow 'c' to close comparison modal, and 'Escape' always passes through
    if (state.isLoading && key !== 'Escape') return;
    if (state.showComparisonModal && key !== 'c' && key !== 'Escape') return;

    switch (key) {
      case 'k':
        // Toggle keyboard mode
        get().setKeyboardMode(!state.keyboardMode);
        break;
        
      case 'ArrowUp':
      case 'ArrowDown':
        if (state.keyboardMode) {
          get().navigateBacklogItems(key === 'ArrowUp' ? 'up' : 'down');
        }
        break;
        
      case 'Enter':
      case ' ':
        if (state.keyboardMode) {
          get().quickAssignSelected();
        }
        break;
        
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        get().quickAssignToPosition(parseInt(key));
        break;
        
      case '0':
        get().quickAssignToPosition(10);
        break;
        
      case 'c':
        // Toggle comparison modal
        get().setShowComparisonModal(!state.showComparisonModal);
        break;
        
      case 'r':
        // Reset session (with confirmation in UI)
        break;
        
      case 's':
        // Save progress
        get().saveMatchProgress();
        break;

      case 'f':
        // Toggle smart fill mode
        get().toggleSmartFill();
        break;

      case 'p':
        // Place to top suggested position (when in keyboard mode)
        if (state.keyboardMode) {
          get().smartPlaceToSuggested();
        }
        break;

      default:
        // Handle other shortcuts
        break;
    }
  },
  
  // Utilities
  getSelectedBacklogItem: () => {
    const sessionStore = useSessionStore.getState();
    const cursor = useSelectionCursor.getState();

    if (!cursor.itemId) return null;

    return sessionStore.getAvailableBacklogItems()
      .find(item => item.id === cursor.itemId) || null;
  },

  getKeyboardNavigationState: () => {
    const availableItems = useSessionStore.getState().getAvailableBacklogItems();
    const cursor = useSelectionCursor.getState();

    // Derive index on-demand from the cursor — never stale
    const rawIndex = cursor.indexIn(availableItems);
    const selectedIndex = rawIndex === -1 ? 0 : rawIndex;

    return {
      selectedIndex,
      totalItems: availableItems.length,
      selectedItem: availableItems[selectedIndex] || null
    };
  },

  getSmartFillMode: () => {
    return usePlacementStore.getState().smartFillMode;
  }
}));

// Selector hooks for better performance
export const useMatchUI = () => useMatchStore(
  useShallow((state) => ({
    isLoading: state.isLoading,
    backlogError: state.backlogError,
    showComparisonModal: state.showComparisonModal,
    showResultShareModal: state.showResultShareModal,
    keyboardMode: state.keyboardMode
  }))
);

export const useMatchKeyboard = () => useMatchStore(
  useShallow((state) => ({
    keyboardMode: state.keyboardMode,
    navigationState: state.getKeyboardNavigationState(),
    selectedItem: state.getSelectedBacklogItem()
  }))
);

export const useMatchActions = () => useMatchStore(
  useShallow((state) => ({
    initializeMatchSession: state.initializeMatchSession,
    resetMatchSession: state.resetMatchSession,
    saveMatchProgress: state.saveMatchProgress,
    handleKeyboardShortcut: state.handleKeyboardShortcut,
    quickAssignToPosition: state.quickAssignToPosition,
    setKeyboardMode: state.setKeyboardMode,
    startSmartFill: state.startSmartFill,
    stopSmartFill: state.stopSmartFill,
    toggleSmartFill: state.toggleSmartFill,
    smartPlaceItem: state.smartPlaceItem,
  }))
);

// Selector for smart fill panel
export const useSmartFillPanel = () => useMatchStore(
  useShallow((state) => ({
    showSmartFillPanel: state.showSmartFillPanel,
    setShowSmartFillPanel: state.setShowSmartFillPanel,
    toggleSmartFill: state.toggleSmartFill,
  }))
);

// Selector for validation notifications - re-exported from validation-notification-store
// This maintains backwards compatibility for existing consumers
export { useValidationNotifications } from './validation-notification-store';