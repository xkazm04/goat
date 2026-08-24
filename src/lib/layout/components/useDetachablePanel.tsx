'use client';

/**
 * useDetachablePanel
 * Hook and button component for making any panel detachable into its own floating window.
 *
 * Usage:
 *   const { isDetached, detach, attach, DetachButton } = useDetachablePanel({
 *     id: 'collection-browser',
 *     title: 'Collection Browser',
 *     sourcePanel: 'collection-browser',
 *   });
 *
 *   // In your panel header:
 *   <DetachButton />
 *
 *   // Conditionally render inline content:
 *   {!isDetached && <PanelContent />}
 */

import { motion } from 'framer-motion';
import React, { useCallback, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/stores/layout-store';

import type { DetachedWindowConfig, DockEdge } from '../types';

/**
 * Options for useDetachablePanel
 */
interface UseDetachablePanelOptions {
  /** Unique window id */
  id: string;
  /** Window title bar text */
  title: string;
  /** Source panel identifier for renderer resolution */
  sourcePanel: string;
  /** Default size when detached */
  defaultSize?: { width: number; height: number };
  /** Minimum window size */
  minSize?: { width: number; height: number };
  /** Maximum window size */
  maxSize?: { width: number; height: number };
  /** Default position when detached (centered if omitted) */
  defaultPosition?: { x: number; y: number };
  /** Opacity */
  opacity?: number;
}

/**
 * Return type for useDetachablePanel
 */
interface DetachablePanelResult {
  /** Whether this panel is currently detached into a floating window */
  isDetached: boolean;
  /** The detached window config, if detached */
  windowConfig: DetachedWindowConfig | undefined;
  /** Detach the panel into a floating window */
  detach: () => void;
  /** Re-attach the panel (close the floating window) */
  attach: () => void;
  /** Toggle detached state */
  toggle: () => void;
  /** Focus this window (bring to front) */
  focus: () => void;
  /** Minimize this window */
  minimize: () => void;
  /** Maximize this window */
  maximize: () => void;
  /** Dock to an edge */
  dock: (edge: DockEdge) => void;
}

export function useDetachablePanel(options: UseDetachablePanelOptions): DetachablePanelResult {
  const {
    id,
    title,
    sourcePanel,
    defaultSize = { width: 400, height: 500 },
    minSize = { width: 250, height: 200 },
    maxSize = { width: 900, height: 800 },
    defaultPosition,
    opacity = 0.97,
  } = options;

  const store = useLayoutStore();
  const windowConfig = store.detachedWindows.get(id);
  const isDetached = !!windowConfig;

  const detach = useCallback(() => {
    if (isDetached) return;

    // Center on screen if no default position
    const { viewportWidth, viewportHeight } = store.dimensions;
    const position = defaultPosition || {
      x: Math.round((viewportWidth - defaultSize.width) / 2),
      y: Math.round((viewportHeight - defaultSize.height) / 2),
    };

    store.detachWindow({
      id,
      title,
      sourcePanel,
      position,
      size: defaultSize,
      minSize,
      maxSize,
      opacity,
      isDocked: false,
      dockEdge: null,
      isMinimized: false,
      isMaximized: false,
      preMaximize: null,
    });
  }, [isDetached, store, id, title, sourcePanel, defaultSize, minSize, maxSize, defaultPosition, opacity]);

  const attach = useCallback(() => {
    if (!isDetached) return;
    store.attachWindow(id);
  }, [isDetached, store, id]);

  const toggle = useCallback(() => {
    if (isDetached) {
      attach();
    } else {
      detach();
    }
  }, [isDetached, attach, detach]);

  const focus = useCallback(() => {
    store.focusWindow(id);
  }, [store, id]);

  const minimize = useCallback(() => {
    store.minimizeWindow(id);
  }, [store, id]);

  const maximize = useCallback(() => {
    store.maximizeWindow(id);
  }, [store, id]);

  const dock = useCallback(
    (edge: DockEdge) => {
      store.dockWindow(id, edge);
    },
    [store, id]
  );

  return {
    isDetached,
    windowConfig,
    detach,
    attach,
    toggle,
    focus,
    minimize,
    maximize,
    dock,
  };
}

/**
 * DetachButton - A button that detaches/reattaches a panel
 */
interface DetachButtonProps {
  panelId: string;
  title: string;
  sourcePanel: string;
  className?: string;
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  children?: ReactNode;
}

export function DetachButton({
  panelId,
  title,
  sourcePanel,
  className,
  defaultSize,
  minSize,
  maxSize,
  children,
}: DetachButtonProps) {
  const { isDetached, toggle } = useDetachablePanel({
    id: panelId,
    title,
    sourcePanel,
    defaultSize,
    minSize,
    maxSize,
  });

  return (
    <motion.button
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1',
        'rounded-md border text-xs transition-colors',
        isDetached
          ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
          : 'bg-background border-border hover:bg-accent text-muted-foreground hover:text-foreground',
        className
      )}
      onClick={toggle}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={isDetached ? `Re-attach ${title}` : `Detach ${title} into floating window`}
    >
      {children || (
        <>
          <DetachIcon detached={isDetached} />
          <span>{isDetached ? 'Attach' : 'Detach'}</span>
        </>
      )}
    </motion.button>
  );
}

/**
 * Detach/Attach icon
 */
function DetachIcon({ detached }: { detached: boolean }) {
  if (detached) {
    // Arrow pointing into a box (attach)
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="3" width="7" height="7" rx="1" />
        <path d="M11 1L6 6M11 1v3M11 1H8" />
      </svg>
    );
  }
  // Arrow pointing out of a box (detach)
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="7" height="7" rx="1" />
      <path d="M6 6l5-5M11 1v3M11 1H8" />
    </svg>
  );
}
