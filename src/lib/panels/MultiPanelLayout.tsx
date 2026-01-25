'use client';

/**
 * MultiPanelLayout
 * Main layout component for multi-panel collection interface.
 * Uses react-resizable-panels for flexible resizing.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Layout,
  LayoutGrid,
  Settings,
  RotateCcw,
  Save,
  ChevronDown,
} from 'lucide-react';
import {
  usePanelStore,
  useActiveLayout,
  useDockedPanels,
  useFloatingPanels,
  PanelConfig,
} from '@/stores/panel-store';
import { PanelManager } from './PanelManager';
import { PanelTabs } from './PanelTabs';
import { FloatingPanel } from './FloatingPanel';
import { LAYOUT_PRESETS, getPresetOptions } from './presets';

/**
 * Props for panel content renderer
 */
export interface PanelContentRendererProps {
  panel: PanelConfig;
  isActive: boolean;
}

/**
 * Props for MultiPanelLayout
 */
export interface MultiPanelLayoutProps {
  /** Render function for panel content */
  renderPanelContent: (props: PanelContentRendererProps) => React.ReactNode;
  /** Show panel tabs */
  showTabs?: boolean;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Minimum panel size (percentage) */
  minPanelSize?: number;
  /** Default panel size (percentage) */
  defaultPanelSize?: number;
  /** Enable panel collapsing */
  collapsible?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Layout toolbar component
 */
const LayoutToolbar = memo(function LayoutToolbar({
  onDirectionChange,
  onSaveLayout,
  onApplyPreset,
  onReset,
  currentDirection,
}: {
  onDirectionChange: (direction: 'horizontal' | 'vertical') => void;
  onSaveLayout: () => void;
  onApplyPreset: (presetId: string) => void;
  onReset: () => void;
  currentDirection: 'horizontal' | 'vertical';
}) {
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const presetOptions = getPresetOptions();

  const handleSave = () => {
    if (layoutName.trim()) {
      PanelManager.saveLayout(layoutName.trim());
      setLayoutName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border-b border-gray-700/50">
      {/* Direction toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-900/50 rounded-lg">
        <button
          onClick={() => onDirectionChange('horizontal')}
          className={cn(
            'p-1.5 rounded transition-colors',
            currentDirection === 'horizontal'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          )}
          title="Horizontal layout"
        >
          <Layout className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDirectionChange('vertical')}
          className={cn(
            'p-1.5 rounded transition-colors',
            currentDirection === 'vertical'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-gray-400 hover:text-gray-300'
          )}
          title="Vertical layout"
        >
          <Layout className="w-4 h-4 rotate-90" />
        </button>
      </div>

      {/* Presets dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowPresetMenu((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-900/50 hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Presets</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        <AnimatePresence>
          {showPresetMenu && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px]"
            >
              {presetOptions.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onApplyPreset(preset.id);
                    setShowPresetMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex flex-col"
                >
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-xs text-gray-500">{preset.description}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1" />

      {/* Save layout */}
      <div className="relative">
        <button
          onClick={() => setShowSaveDialog((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-300 hover:text-white bg-gray-900/50 hover:bg-gray-700/50 rounded-lg transition-colors"
          title="Save layout"
        >
          <Save className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {showSaveDialog && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full right-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[200px]"
            >
              <input
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="Layout name..."
                className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 px-2 py-1 text-xs text-gray-400 hover:text-white bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!layoutName.trim()}
                  className="flex-1 px-2 py-1 text-xs text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded"
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="p-1.5 text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-700/50 rounded-lg transition-colors"
        title="Reset layout"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
});

/**
 * Panel resize handle
 */
const CustomResizeHandle = memo(function CustomResizeHandle({
  direction,
}: {
  direction: 'horizontal' | 'vertical';
}) {
  return (
    <PanelResizeHandle
      className={cn(
        'group relative flex items-center justify-center',
        'bg-gray-800 hover:bg-cyan-500/20 transition-colors',
        direction === 'horizontal' ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'
      )}
    >
      <div
        className={cn(
          'bg-gray-600 group-hover:bg-cyan-400 transition-colors rounded-full',
          direction === 'horizontal' ? 'w-0.5 h-8' : 'h-0.5 w-8'
        )}
      />
    </PanelResizeHandle>
  );
});

/**
 * MultiPanelLayout Component
 *
 * A flexible multi-panel layout system for collection panels.
 * Uses react-resizable-panels for smooth resizing.
 *
 * Features:
 * - Multiple simultaneous panels
 * - Resizable panel widths
 * - Vertical/horizontal stacking
 * - Save/load layouts
 * - Layout presets
 * - Floating detached panels
 * - Mobile graceful degradation
 */
export const MultiPanelLayout = memo(function MultiPanelLayout({
  renderPanelContent,
  showTabs = true,
  showToolbar = true,
  minPanelSize = 15,
  defaultPanelSize = 33,
  collapsible = true,
  className,
}: MultiPanelLayoutProps) {
  const layout = useActiveLayout();
  const dockedPanels = useDockedPanels();
  const floatingPanels = useFloatingPanels();
  const activePanelId = usePanelStore((state) => state.activePanelId);
  const setLayoutSizes = usePanelStore((state) => state.setLayoutSizes);

  // Initialize panel manager
  useEffect(() => {
    PanelManager.initialize();
  }, []);

  // Handle layout direction change
  const handleDirectionChange = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      PanelManager.setLayoutDirection(direction);
    },
    []
  );

  // Handle save layout
  const handleSaveLayout = useCallback(() => {
    // Handled in toolbar
  }, []);

  // Handle apply preset
  const handleApplyPreset = useCallback((presetId: string) => {
    PanelManager.applyPreset(presetId);
  }, []);

  // Handle reset
  const handleReset = useCallback(() => {
    PanelManager.reset();
  }, []);

  // Handle resize
  const handleResize = useCallback(
    (sizes: number[]) => {
      setLayoutSizes(sizes);
    },
    [setLayoutSizes]
  );

  // Check if on mobile (single panel mode)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile: show only active panel
  if (isMobile) {
    const activePanel = dockedPanels.find((p) => p.id === activePanelId) || dockedPanels[0];

    return (
      <div className={cn('flex flex-col h-full', className)}>
        {showTabs && <PanelTabs compact />}
        {activePanel && (
          <div className="flex-1 overflow-hidden">
            {renderPanelContent({
              panel: activePanel,
              isActive: true,
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)} data-testid="multi-panel-layout">
      {/* Toolbar */}
      {showToolbar && (
        <LayoutToolbar
          onDirectionChange={handleDirectionChange}
          onSaveLayout={handleSaveLayout}
          onApplyPreset={handleApplyPreset}
          onReset={handleReset}
          currentDirection={layout.direction}
        />
      )}

      {/* Tabs */}
      {showTabs && <PanelTabs />}

      {/* Panel group */}
      <div className="flex-1 overflow-hidden">
        {dockedPanels.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No panels</p>
              <button
                onClick={() => PanelManager.addPanel()}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
              >
                Add a panel
              </button>
            </div>
          </div>
        ) : (
          <PanelGroup
            direction={layout.direction}
            onLayout={handleResize}
            className="h-full"
          >
            {dockedPanels.map((panel, index) => (
              <React.Fragment key={panel.id}>
                {index > 0 && <CustomResizeHandle direction={layout.direction} />}
                <Panel
                  id={panel.id}
                  order={panel.order}
                  defaultSize={layout.sizes[index] || defaultPanelSize}
                  minSize={minPanelSize}
                  collapsible={collapsible}
                  className={cn(
                    'transition-shadow',
                    panel.id === activePanelId && 'shadow-lg shadow-cyan-500/5'
                  )}
                >
                  <motion.div
                    className={cn(
                      'h-full border-l first:border-l-0',
                      layout.direction === 'vertical' && 'border-l-0 border-t first:border-t-0',
                      panel.id === activePanelId
                        ? 'border-cyan-500/30'
                        : 'border-gray-700/50'
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {renderPanelContent({
                      panel,
                      isActive: panel.id === activePanelId,
                    })}
                  </motion.div>
                </Panel>
              </React.Fragment>
            ))}
          </PanelGroup>
        )}
      </div>

      {/* Floating panels */}
      <AnimatePresence>
        {floatingPanels.map((panel) => (
          <FloatingPanel key={panel.id} panel={panel}>
            {renderPanelContent({
              panel,
              isActive: panel.id === activePanelId,
            })}
          </FloatingPanel>
        ))}
      </AnimatePresence>
    </div>
  );
});

export default MultiPanelLayout;
