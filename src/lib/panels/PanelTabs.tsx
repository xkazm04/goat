'use client';

/**
 * PanelTabs
 * Quick panel switching tabs component.
 * Allows users to switch between panels and manage them.
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Plus,
  X,
  MoreVertical,
  Copy,
  ExternalLink,
  Minimize2,
  Maximize2,
  Grid,
  List,
  ChevronDown,
} from 'lucide-react';
import {
  usePanelStore,
  usePanelList,
  useActivePanelId,
  PanelConfig,
} from '@/stores/panel-store';
import { PanelManager } from './PanelManager';

/**
 * Props for PanelTabs component
 */
export interface PanelTabsProps {
  /** Show add panel button */
  showAddButton?: boolean;
  /** Show panel actions menu */
  showActions?: boolean;
  /** Enable tab reordering */
  enableReorder?: boolean;
  /** Maximum visible tabs (rest in overflow) */
  maxVisibleTabs?: number;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Single panel tab
 */
const PanelTab = memo(function PanelTab({
  panel,
  isActive,
  showActions,
  compact,
  onActivate,
  onClose,
  onToggleFloat,
  onDuplicate,
}: {
  panel: PanelConfig;
  isActive: boolean;
  showActions?: boolean;
  compact?: boolean;
  onActivate: () => void;
  onClose: () => void;
  onToggleFloat: () => void;
  onDuplicate: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  }, []);

  const handleAction = useCallback(
    (action: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(false);

      switch (action) {
        case 'duplicate':
          onDuplicate();
          break;
        case 'float':
          onToggleFloat();
          break;
        case 'close':
          onClose();
          break;
      }
    },
    [onClose, onToggleFloat, onDuplicate]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'relative flex items-center gap-1 rounded-t-lg border border-b-0 transition-colors cursor-pointer',
        compact ? 'px-2 py-1' : 'px-3 py-1.5',
        isActive
          ? 'bg-gray-800 border-gray-600 text-white'
          : 'bg-gray-900/50 border-gray-700/50 text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
      )}
      onClick={onActivate}
      data-testid={`panel-tab-${panel.id}`}
    >
      {/* Color indicator */}
      {panel.color && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: panel.color }}
        />
      )}

      {/* Title */}
      <span className={cn('truncate', compact ? 'text-xs max-w-[80px]' : 'text-sm max-w-[120px]')}>
        {panel.title}
      </span>

      {/* View mode indicator */}
      <span className="text-gray-500">
        {panel.viewMode === 'grid' ? (
          <Grid className="w-3 h-3" />
        ) : (
          <List className="w-3 h-3" />
        )}
      </span>

      {/* Floating indicator */}
      {panel.isFloating && (
        <ExternalLink className="w-3 h-3 text-cyan-400" />
      )}

      {/* Actions */}
      {showActions && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={handleMenuToggle}
            className="p-0.5 rounded hover:bg-gray-700 transition-colors"
          >
            <MoreVertical className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                className="absolute top-full right-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]"
              >
                <button
                  onClick={handleAction('duplicate')}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </button>
                <button
                  onClick={handleAction('float')}
                  className="w-full px-3 py-1.5 text-xs text-left text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                >
                  {panel.isFloating ? (
                    <>
                      <Minimize2 className="w-3 h-3" />
                      Dock Panel
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3 h-3" />
                      Float Panel
                    </>
                  )}
                </button>
                <div className="border-t border-gray-700 my-1" />
                <button
                  onClick={handleAction('close')}
                  className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-gray-700 flex items-center gap-2"
                >
                  <X className="w-3 h-3" />
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Close button */}
      {!showActions && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-0.5 rounded hover:bg-gray-700 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
});

/**
 * PanelTabs Component
 *
 * Tab bar for quick panel switching and management.
 *
 * Features:
 * - Tab for each panel
 * - Active state indication
 * - Add new panel button
 * - Panel actions menu
 * - Drag to reorder
 * - Overflow handling
 */
export const PanelTabs = memo(function PanelTabs({
  showAddButton = true,
  showActions = true,
  enableReorder = true,
  maxVisibleTabs = 6,
  compact = false,
  className,
}: PanelTabsProps) {
  const panels = usePanelList();
  const activePanelId = useActivePanelId();
  const setActivePanel = usePanelStore((state) => state.setActivePanel);
  const reorderPanels = usePanelStore((state) => state.reorderPanels);

  const [showOverflow, setShowOverflow] = useState(false);

  const visiblePanels = panels.slice(0, maxVisibleTabs);
  const overflowPanels = panels.slice(maxVisibleTabs);
  const hasOverflow = overflowPanels.length > 0;

  const handleAddPanel = useCallback(() => {
    PanelManager.addPanel();
  }, []);

  const handleActivate = useCallback(
    (panelId: string) => () => {
      setActivePanel(panelId);
    },
    [setActivePanel]
  );

  const handleClose = useCallback(
    (panelId: string) => () => {
      PanelManager.removePanel(panelId);
    },
    []
  );

  const handleToggleFloat = useCallback(
    (panelId: string) => () => {
      PanelManager.toggleFloat(panelId);
    },
    []
  );

  const handleDuplicate = useCallback(
    (panelId: string) => () => {
      const store = usePanelStore.getState();
      store.duplicatePanel(panelId);
    },
    []
  );

  const handleReorder = useCallback(
    (newOrder: PanelConfig[]) => {
      reorderPanels(newOrder.map((p) => p.id));
    },
    [reorderPanels]
  );

  const isAtMax = PanelManager.isAtMaxPanels();

  return (
    <div
      className={cn(
        'flex items-end gap-1 px-2 pt-2 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50',
        className
      )}
      data-testid="panel-tabs"
    >
      {/* Tabs */}
      {enableReorder ? (
        <Reorder.Group
          axis="x"
          values={visiblePanels}
          onReorder={handleReorder}
          className="flex items-end gap-1"
        >
          <AnimatePresence mode="popLayout">
            {visiblePanels.map((panel) => (
              <Reorder.Item
                key={panel.id}
                value={panel}
                className="cursor-grab active:cursor-grabbing"
              >
                <PanelTab
                  panel={panel}
                  isActive={panel.id === activePanelId}
                  showActions={showActions}
                  compact={compact}
                  onActivate={handleActivate(panel.id)}
                  onClose={handleClose(panel.id)}
                  onToggleFloat={handleToggleFloat(panel.id)}
                  onDuplicate={handleDuplicate(panel.id)}
                />
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      ) : (
        <div className="flex items-end gap-1">
          <AnimatePresence mode="popLayout">
            {visiblePanels.map((panel) => (
              <PanelTab
                key={panel.id}
                panel={panel}
                isActive={panel.id === activePanelId}
                showActions={showActions}
                compact={compact}
                onActivate={handleActivate(panel.id)}
                onClose={handleClose(panel.id)}
                onToggleFloat={handleToggleFloat(panel.id)}
                onDuplicate={handleDuplicate(panel.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Overflow menu */}
      {hasOverflow && (
        <div className="relative">
          <button
            onClick={() => setShowOverflow((prev) => !prev)}
            className={cn(
              'flex items-center gap-1 px-2 py-1.5 rounded-t-lg border border-b-0 transition-colors',
              'bg-gray-900/50 border-gray-700/50 text-gray-400 hover:text-gray-300 hover:bg-gray-800/50',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            +{overflowPanels.length}
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {showOverflow && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
              >
                {overflowPanels.map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => {
                      setActivePanel(panel.id);
                      setShowOverflow(false);
                    }}
                    className={cn(
                      'w-full px-3 py-1.5 text-xs text-left flex items-center gap-2',
                      panel.id === activePanelId
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    )}
                  >
                    {panel.color && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: panel.color }}
                      />
                    )}
                    <span className="truncate">{panel.title}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Add button */}
      {showAddButton && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAddPanel}
          disabled={isAtMax}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-t-lg border border-b-0 transition-colors',
            'text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50',
            'border-gray-700/50 border-dashed',
            isAtMax && 'opacity-50 cursor-not-allowed',
            compact ? 'text-xs' : 'text-sm'
          )}
          title={isAtMax ? 'Maximum panels reached' : 'Add new panel'}
        >
          <Plus className="w-3.5 h-3.5" />
          {!compact && <span>Add</span>}
        </motion.button>
      )}
    </div>
  );
});

export default PanelTabs;
