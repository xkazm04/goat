// This file is for backward compatibility during transition
// It re-exports the modularized backlog store

import { useBacklogStore } from './backlog';
export { useBacklogStore };

// Re-export the selectors for backward compatibility
export {
  useBacklogGroups,
  useBacklogFilters,
  useBacklogSelection,
  useBacklogLoading,
  useBacklogItem,
  useBacklogOfflineStatus
} from './backlog/selectors';