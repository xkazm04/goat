/**
 * PanelManager
 * Orchestrates panel state and provides utilities for panel management.
 * Integrates with panel-store for state persistence.
 */

import {
  usePanelStore,
  PanelConfig,
  PanelFilter,
  LayoutConfig,
  LayoutPreset,
} from '@/stores/panel-store';
import { LAYOUT_PRESETS } from './presets';

/**
 * Panel event types
 */
export type PanelEventType =
  | 'panel:added'
  | 'panel:removed'
  | 'panel:updated'
  | 'panel:activated'
  | 'panel:minimized'
  | 'panel:maximized'
  | 'panel:floated'
  | 'panel:docked'
  | 'layout:changed'
  | 'preset:applied';

/**
 * Panel event payload
 */
export interface PanelEvent {
  type: PanelEventType;
  panelId?: string;
  data?: unknown;
  timestamp: number;
}

/**
 * Event listener type
 */
export type PanelEventListener = (event: PanelEvent) => void;

/**
 * PanelManager class
 * Singleton manager for panel operations and events
 */
class PanelManagerClass {
  private listeners: Map<PanelEventType, Set<PanelEventListener>> = new Map();
  private initialized = false;

  /**
   * Initialize panel manager
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Ensure at least one panel exists
    const state = usePanelStore.getState();
    if (Object.keys(state.panels).length === 0) {
      this.addDefaultPanel();
    }
  }

  /**
   * Add default panel
   */
  addDefaultPanel(): string {
    const store = usePanelStore.getState();
    return store.addPanel({
      title: 'Collection',
    });
  }

  /**
   * Add a new panel
   */
  addPanel(config?: Partial<PanelConfig>): string {
    const store = usePanelStore.getState();
    const panelId = store.addPanel(config);

    if (panelId) {
      this.emit('panel:added', panelId);
    }

    return panelId;
  }

  /**
   * Remove a panel
   */
  removePanel(panelId: string): void {
    const store = usePanelStore.getState();
    const panelCount = Object.keys(store.panels).length;

    // Don't remove last panel
    if (panelCount <= 1) {
      console.warn('Cannot remove last panel');
      return;
    }

    store.removePanel(panelId);
    this.emit('panel:removed', panelId);
  }

  /**
   * Update panel configuration
   */
  updatePanel(panelId: string, updates: Partial<PanelConfig>): void {
    const store = usePanelStore.getState();
    store.updatePanel(panelId, updates);
    this.emit('panel:updated', panelId, updates);
  }

  /**
   * Set panel filter
   */
  setPanelFilter(panelId: string, filter: Partial<PanelFilter>): void {
    const store = usePanelStore.getState();
    store.setPanelFilter(panelId, filter);
  }

  /**
   * Activate a panel
   */
  activatePanel(panelId: string): void {
    const store = usePanelStore.getState();
    store.setActivePanel(panelId);
    this.emit('panel:activated', panelId);
  }

  /**
   * Minimize a panel
   */
  minimizePanel(panelId: string): void {
    const store = usePanelStore.getState();
    store.minimizePanel(panelId);
    this.emit('panel:minimized', panelId);
  }

  /**
   * Maximize a panel
   */
  maximizePanel(panelId: string): void {
    const store = usePanelStore.getState();
    store.maximizePanel(panelId);
    this.emit('panel:maximized', panelId);
  }

  /**
   * Toggle panel floating state
   */
  toggleFloat(panelId: string): void {
    const store = usePanelStore.getState();
    const panel = store.panels[panelId];
    const wasFloating = panel?.isFloating;

    store.togglePanelFloat(panelId);
    this.emit(wasFloating ? 'panel:docked' : 'panel:floated', panelId);
  }

  /**
   * Float a panel at specific position
   */
  floatPanel(
    panelId: string,
    position: { x: number; y: number },
    size?: { width: number; height: number }
  ): void {
    const store = usePanelStore.getState();
    store.updatePanel(panelId, {
      isFloating: true,
      floatingPosition: position,
      floatingSize: size || { width: 400, height: 500 },
    });
    this.emit('panel:floated', panelId);
  }

  /**
   * Dock a floating panel
   */
  dockPanel(panelId: string): void {
    const store = usePanelStore.getState();
    store.updatePanel(panelId, {
      isFloating: false,
    });
    this.emit('panel:docked', panelId);
  }

  /**
   * Update floating panel position
   */
  updateFloatingPosition(panelId: string, position: { x: number; y: number }): void {
    const store = usePanelStore.getState();
    store.updatePanel(panelId, {
      floatingPosition: position,
    });
  }

  /**
   * Update floating panel size
   */
  updateFloatingSize(panelId: string, size: { width: number; height: number }): void {
    const store = usePanelStore.getState();
    store.updatePanel(panelId, {
      floatingSize: size,
    });
  }

  /**
   * Set layout direction
   */
  setLayoutDirection(direction: 'horizontal' | 'vertical'): void {
    const store = usePanelStore.getState();
    store.setLayoutDirection(direction);
    this.emit('layout:changed', undefined, { direction });
  }

  /**
   * Set layout sizes
   */
  setLayoutSizes(sizes: number[]): void {
    const store = usePanelStore.getState();
    store.setLayoutSizes(sizes);
  }

  /**
   * Reorder panels
   */
  reorderPanels(panelIds: string[]): void {
    const store = usePanelStore.getState();
    store.reorderPanels(panelIds);
    this.emit('layout:changed', undefined, { panelIds });
  }

  /**
   * Save current layout
   */
  saveLayout(name: string): void {
    const store = usePanelStore.getState();
    store.saveCurrentLayout(name);
  }

  /**
   * Load saved layout
   */
  loadLayout(layoutId: string): void {
    const store = usePanelStore.getState();
    store.loadLayout(layoutId);
    this.emit('layout:changed', undefined, { layoutId });
  }

  /**
   * Delete saved layout
   */
  deleteLayout(layoutId: string): void {
    const store = usePanelStore.getState();
    store.deleteLayout(layoutId);
  }

  /**
   * Apply a preset
   */
  applyPreset(presetId: string): void {
    const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
    if (!preset) {
      console.warn(`Preset not found: ${presetId}`);
      return;
    }

    const store = usePanelStore.getState();

    // Clear existing panels
    Object.keys(store.panels).forEach((id) => {
      store.removePanel(id);
    });

    // Create panels from preset
    const newPanelIds: string[] = [];
    preset.panels.forEach((panelConfig, index) => {
      const id = store.addPanel({
        ...panelConfig,
        order: index,
      });
      if (id) {
        newPanelIds.push(id);
      }
    });

    // Apply layout
    store.setLayout({
      ...preset.layout,
      panelIds: newPanelIds,
      sizes: preset.layout.sizes.length === newPanelIds.length
        ? preset.layout.sizes
        : newPanelIds.map(() => 100 / newPanelIds.length),
    });

    this.emit('preset:applied', undefined, { presetId, preset });
  }

  /**
   * Get available presets
   */
  getPresets(): LayoutPreset[] {
    return LAYOUT_PRESETS;
  }

  /**
   * Get panel by ID
   */
  getPanel(panelId: string): PanelConfig | undefined {
    const store = usePanelStore.getState();
    return store.panels[panelId];
  }

  /**
   * Get all panels
   */
  getAllPanels(): PanelConfig[] {
    const store = usePanelStore.getState();
    return Object.values(store.panels);
  }

  /**
   * Get current layout
   */
  getCurrentLayout(): LayoutConfig {
    const store = usePanelStore.getState();
    return store.activeLayout;
  }

  /**
   * Subscribe to panel events
   */
  on(event: PanelEventType, listener: PanelEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  /**
   * Emit panel event
   */
  private emit(type: PanelEventType, panelId?: string, data?: unknown): void {
    const event: PanelEvent = {
      type,
      panelId,
      data,
      timestamp: Date.now(),
    };

    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in panel event listener for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Check if we're at max panels
   */
  isAtMaxPanels(): boolean {
    const store = usePanelStore.getState();
    return Object.keys(store.panels).length >= store.maxPanels;
  }

  /**
   * Get panel count
   */
  getPanelCount(): number {
    const store = usePanelStore.getState();
    return Object.keys(store.panels).length;
  }

  /**
   * Reset to default state
   */
  reset(): void {
    const store = usePanelStore.getState();
    store.reset();
    this.addDefaultPanel();
  }
}

// Export singleton instance
export const PanelManager = new PanelManagerClass();

export default PanelManager;
