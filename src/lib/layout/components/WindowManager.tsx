'use client';

/**
 * WindowManager
 * Renders all detached windows and the minimized window taskbar.
 * Drop this into the app shell alongside other layout providers.
 */

import React, { type ReactNode, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/stores/layout-store';
import { DetachableWindow } from './DetachableWindow';
import type { DetachedWindowConfig } from '../types';

/**
 * Registry for panel content renderers.
 * Panels register themselves so WindowManager can render their content
 * when they are detached.
 */
type PanelRenderer = (windowConfig: DetachedWindowConfig) => ReactNode;
const panelRenderers = new Map<string, PanelRenderer>();

/**
 * Register a panel renderer for a given sourcePanel id.
 * Call this at module level or in a useEffect for each detachable panel type.
 */
export function registerPanelRenderer(sourcePanel: string, renderer: PanelRenderer) {
  panelRenderers.set(sourcePanel, renderer);
}

/**
 * Unregister a panel renderer.
 */
export function unregisterPanelRenderer(sourcePanel: string) {
  panelRenderers.delete(sourcePanel);
}

/**
 * WindowManager Props
 */
interface WindowManagerProps {
  /** Optional: provide children renderers by sourcePanel key instead of using the registry */
  renderPanel?: (windowConfig: DetachedWindowConfig) => ReactNode;
}

/**
 * WindowManager Component
 *
 * Renders:
 * 1. All non-minimized detached windows using registered renderers
 * 2. A taskbar strip at the bottom for minimized windows
 */
export function WindowManager({ renderPanel }: WindowManagerProps) {
  const detachedWindows = useLayoutStore((s) => s.detachedWindows);
  const restoreWindow = useLayoutStore((s) => s.restoreWindow);
  const focusWindow = useLayoutStore((s) => s.focusWindow);
  const attachWindow = useLayoutStore((s) => s.attachWindow);
  const arrangeWindows = useLayoutStore((s) => s.arrangeWindows);
  const closeAllWindows = useLayoutStore((s) => s.closeAllWindows);

  const windows = useMemo(() => Array.from(detachedWindows.values()), [detachedWindows]);
  const minimizedWindows = useMemo(() => windows.filter((w) => w.isMinimized), [windows]);
  const visibleWindows = useMemo(() => windows.filter((w) => !w.isMinimized), [windows]);

  const handleRestoreClick = useCallback(
    (id: string) => {
      restoreWindow(id);
      focusWindow(id);
    },
    [restoreWindow, focusWindow]
  );

  // Resolve content for a window
  const getWindowContent = useCallback(
    (config: DetachedWindowConfig): ReactNode => {
      // Prefer prop-based renderer
      if (renderPanel) {
        return renderPanel(config);
      }
      // Fall back to registry
      const renderer = panelRenderers.get(config.sourcePanel);
      if (renderer) {
        return renderer(config);
      }
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
          Panel &quot;{config.sourcePanel}&quot; has no registered renderer
        </div>
      );
    },
    [renderPanel]
  );

  if (windows.length === 0) return null;

  return (
    <>
      {/* Detached windows */}
      <AnimatePresence>
        {visibleWindows.map((win) => (
          <DetachableWindow key={win.id} windowId={win.id}>
            {getWindowContent(win)}
          </DetachableWindow>
        ))}
      </AnimatePresence>

      {/* Minimized window taskbar */}
      {minimizedWindows.length > 0 && (
        <motion.div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-sticky',
            'flex items-center gap-1 px-3 py-1.5',
            'bg-background/90 backdrop-blur-sm border-t border-border'
          )}
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40 }}
        >
          {/* Minimized window pills */}
          {minimizedWindows.map((win) => (
            <button
              key={win.id}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-md',
                'bg-muted/50 hover:bg-muted border border-border',
                'text-sm text-foreground/80 hover:text-foreground',
                'transition-colors max-w-[180px]'
              )}
              onClick={() => handleRestoreClick(win.id)}
              title={`Restore: ${win.title}`}
            >
              <span className="text-xs">📌</span>
              <span className="truncate">{win.title}</span>
            </button>
          ))}

          {/* Window management actions */}
          {windows.length > 1 && (
            <div className="ml-auto flex items-center gap-1">
              <TaskbarAction
                onClick={() => arrangeWindows('tile-horizontal')}
                title="Tile horizontally"
              >
                |||
              </TaskbarAction>
              <TaskbarAction
                onClick={() => arrangeWindows('tile-vertical')}
                title="Tile vertically"
              >
                &#x2261;
              </TaskbarAction>
              <TaskbarAction
                onClick={() => arrangeWindows('cascade')}
                title="Cascade"
              >
                &#x29C9;
              </TaskbarAction>
              <TaskbarAction
                onClick={closeAllWindows}
                title="Close all windows"
              >
                &#x2715;
              </TaskbarAction>
            </div>
          )}
        </motion.div>
      )}
    </>
  );
}

function TaskbarAction({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={cn(
        'w-7 h-6 rounded-sm flex items-center justify-center',
        'text-xs text-muted-foreground hover:text-foreground',
        'hover:bg-muted/80 transition-colors'
      )}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
