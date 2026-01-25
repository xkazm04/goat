/**
 * Panel Layout Presets
 * Pre-configured panel arrangements for common use cases.
 */

import { LayoutPreset, PanelConfig, LayoutConfig } from '@/stores/panel-store';

/**
 * Preset panel colors
 */
export const PANEL_COLORS = {
  cyan: '#06b6d4',
  purple: '#a855f7',
  pink: '#ec4899',
  amber: '#f59e0b',
  emerald: '#10b981',
  blue: '#3b82f6',
  red: '#ef4444',
  indigo: '#6366f1',
} as const;

/**
 * Single panel - Focus Mode
 * One large panel for focused browsing
 */
const FOCUS_MODE: LayoutPreset = {
  id: 'focus-mode',
  name: 'Focus Mode',
  description: 'Single panel for focused browsing',
  icon: 'focus',
  layout: {
    id: 'focus-layout',
    name: 'Focus',
    direction: 'horizontal',
    panelIds: [],
    sizes: [100],
  },
  panels: [
    {
      title: 'Collection',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 0,
      color: PANEL_COLORS.cyan,
    },
  ],
};

/**
 * Compare Mode - Two panels side by side
 * For comparing items from different categories
 */
const COMPARE_MODE: LayoutPreset = {
  id: 'compare-mode',
  name: 'Compare Mode',
  description: 'Two panels side by side for comparison',
  icon: 'compare',
  layout: {
    id: 'compare-layout',
    name: 'Compare',
    direction: 'horizontal',
    panelIds: [],
    sizes: [50, 50],
  },
  panels: [
    {
      title: 'Panel A',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 0,
      color: PANEL_COLORS.cyan,
    },
    {
      title: 'Panel B',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 1,
      color: PANEL_COLORS.purple,
    },
  ],
};

/**
 * Research Mode - Three panels
 * Main panel with two reference panels
 */
const RESEARCH_MODE: LayoutPreset = {
  id: 'research-mode',
  name: 'Research Mode',
  description: 'Main panel with two reference panels',
  icon: 'research',
  layout: {
    id: 'research-layout',
    name: 'Research',
    direction: 'horizontal',
    panelIds: [],
    sizes: [50, 25, 25],
  },
  panels: [
    {
      title: 'Main Collection',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 0,
      color: PANEL_COLORS.cyan,
    },
    {
      title: 'Reference 1',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'list',
      isMinimized: false,
      isFloating: false,
      order: 1,
      color: PANEL_COLORS.amber,
    },
    {
      title: 'Reference 2',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'list',
      isMinimized: false,
      isFloating: false,
      order: 2,
      color: PANEL_COLORS.emerald,
    },
  ],
};

/**
 * Stack Mode - Vertical stacking
 * Panels stacked vertically
 */
const STACK_MODE: LayoutPreset = {
  id: 'stack-mode',
  name: 'Stack Mode',
  description: 'Panels stacked vertically',
  icon: 'stack',
  layout: {
    id: 'stack-layout',
    name: 'Stack',
    direction: 'vertical',
    panelIds: [],
    sizes: [50, 50],
  },
  panels: [
    {
      title: 'Top Panel',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 0,
      color: PANEL_COLORS.blue,
    },
    {
      title: 'Bottom Panel',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 1,
      color: PANEL_COLORS.pink,
    },
  ],
};

/**
 * Grid Mode - Four panels in a grid
 * 2x2 grid of panels for power users
 */
const GRID_MODE: LayoutPreset = {
  id: 'grid-mode',
  name: 'Grid Mode',
  description: 'Four panels in a 2x2 grid',
  icon: 'grid',
  layout: {
    id: 'grid-layout',
    name: 'Grid',
    direction: 'horizontal',
    panelIds: [],
    sizes: [25, 25, 25, 25],
  },
  panels: [
    {
      title: 'Panel 1',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 0,
      color: PANEL_COLORS.cyan,
    },
    {
      title: 'Panel 2',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 1,
      color: PANEL_COLORS.purple,
    },
    {
      title: 'Panel 3',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 2,
      color: PANEL_COLORS.amber,
    },
    {
      title: 'Panel 4',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 3,
      color: PANEL_COLORS.emerald,
    },
  ],
};

/**
 * Master Mode - Main panel with floating reference
 * One docked panel with a floating reference panel
 */
const MASTER_MODE: LayoutPreset = {
  id: 'master-mode',
  name: 'Master Mode',
  description: 'Main panel with floating reference',
  icon: 'master',
  layout: {
    id: 'master-layout',
    name: 'Master',
    direction: 'horizontal',
    panelIds: [],
    sizes: [100],
  },
  panels: [
    {
      title: 'Main Collection',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'name',
        sortOrder: 'asc',
      },
      viewMode: 'grid',
      isMinimized: false,
      isFloating: false,
      order: 0,
      color: PANEL_COLORS.cyan,
    },
    {
      title: 'Quick Reference',
      filter: {
        searchTerm: '',
        selectedGroupIds: [],
        sortBy: 'ranking',
        sortOrder: 'desc',
      },
      viewMode: 'list',
      isMinimized: false,
      isFloating: true,
      floatingPosition: { x: 20, y: 100 },
      floatingSize: { width: 320, height: 400 },
      order: 1,
      color: PANEL_COLORS.indigo,
    },
  ],
};

/**
 * All available presets
 */
export const LAYOUT_PRESETS: LayoutPreset[] = [
  FOCUS_MODE,
  COMPARE_MODE,
  RESEARCH_MODE,
  STACK_MODE,
  GRID_MODE,
  MASTER_MODE,
];

/**
 * Get preset by ID
 */
export function getPreset(presetId: string): LayoutPreset | undefined {
  return LAYOUT_PRESETS.find((p) => p.id === presetId);
}

/**
 * Get preset names for display
 */
export function getPresetOptions(): Array<{ id: string; name: string; description: string }> {
  return LAYOUT_PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));
}

/**
 * Create custom preset from current layout
 */
export function createCustomPreset(
  name: string,
  description: string,
  layout: LayoutConfig,
  panels: PanelConfig[]
): LayoutPreset {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    icon: 'custom',
    layout: {
      ...layout,
      id: `custom-layout-${Date.now()}`,
      name,
    },
    panels: panels.map(({ id, ...rest }) => rest),
  };
}

export default LAYOUT_PRESETS;
