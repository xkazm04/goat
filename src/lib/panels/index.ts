/**
 * Panels Module
 *
 * Multi-panel collection interface with customizable layouts.
 * Provides components and utilities for creating flexible
 * workspace arrangements with multiple collection panels.
 *
 * @module panels
 */

// Panel Manager
export { PanelManager, default } from './PanelManager';
export type {
  PanelEventType,
  PanelEvent,
  PanelEventListener,
} from './PanelManager';

// Layout Presets
export {
  LAYOUT_PRESETS,
  PANEL_COLORS,
  getPreset,
  getPresetOptions,
  createCustomPreset,
} from './presets';

// Panel Tabs
export { PanelTabs } from './PanelTabs';
export type { PanelTabsProps } from './PanelTabs';

// Floating Panel
export { FloatingPanel } from './FloatingPanel';
export type { FloatingPanelProps } from './FloatingPanel';

// Multi Panel Layout
export { MultiPanelLayout } from './MultiPanelLayout';
export type {
  PanelContentRendererProps,
  MultiPanelLayoutProps,
} from './MultiPanelLayout';

// Re-export store types for convenience
export type {
  PanelConfig,
  PanelFilter,
  LayoutConfig,
  LayoutPreset,
  PanelState,
  PanelActions,
} from '@/stores/panel-store';

// Re-export store hooks
export {
  usePanelStore,
  usePanels,
  useActiveLayout,
  useActivePanelId,
  useSavedLayouts,
  useIsDockVisible,
  usePanel,
  usePanelList,
  useFloatingPanels,
  useDockedPanels,
} from '@/stores/panel-store';

/**
 * Quick start example:
 *
 * ```tsx
 * import {
 *   MultiPanelLayout,
 *   PanelManager,
 *   usePanelStore,
 * } from '@/lib/panels';
 *
 * function CollectionWorkspace() {
 *   // Initialize on mount
 *   useEffect(() => {
 *     PanelManager.initialize();
 *   }, []);
 *
 *   return (
 *     <MultiPanelLayout
 *       renderPanelContent={({ panel, isActive }) => (
 *         <CollectionPanel
 *           key={panel.id}
 *           category={panel.category}
 *           filter={panel.filter}
 *           viewMode={panel.viewMode}
 *           isActive={isActive}
 *         />
 *       )}
 *       showTabs
 *       showToolbar
 *     />
 *   );
 * }
 *
 * // Add a new panel
 * PanelManager.addPanel({ title: 'Movies', category: 'movies' });
 *
 * // Apply a preset
 * PanelManager.applyPreset('compare-mode');
 *
 * // Save current layout
 * PanelManager.saveLayout('My Custom Layout');
 * ```
 */
