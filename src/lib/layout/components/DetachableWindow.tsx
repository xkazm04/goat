'use client';

/**
 * DetachableWindow
 * A floating, draggable, resizable, dockable window for the multi-window workspace.
 * Built on the same primitives as PictureInPicture but supports multiple instances,
 * window management (minimize/maximize/restore), and edge docking.
 */

import { motion, PanInfo, useDragControls } from 'framer-motion';
import React, {
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/stores/layout-store';

import { LAYOUT_ANIMATIONS } from '../constants';

import type { DockEdge } from '../types';

/**
 * DetachableWindow Props
 */
interface DetachableWindowProps {
  windowId: string;
  children: ReactNode;
  className?: string;
  /** Called when the window is closed (re-attached) */
  onClose?: () => void;
}

/**
 * Get docked position and size for an edge
 */
function getDockedLayout(
  edge: DockEdge,
  viewportWidth: number,
  viewportHeight: number,
  minSize: { width: number; height: number }
) {
  switch (edge) {
    case 'left':
      return {
        position: { x: 0, y: 0 },
        size: { width: Math.max(minSize.width, Math.round(viewportWidth * 0.3)), height: viewportHeight },
      };
    case 'right':
      return {
        position: { x: Math.round(viewportWidth * 0.7), y: 0 },
        size: { width: Math.max(minSize.width, Math.round(viewportWidth * 0.3)), height: viewportHeight },
      };
    case 'top':
      return {
        position: { x: 0, y: 0 },
        size: { width: viewportWidth, height: Math.max(minSize.height, Math.round(viewportHeight * 0.4)) },
      };
    case 'bottom':
      return {
        position: { x: 0, y: Math.round(viewportHeight * 0.6) },
        size: { width: viewportWidth, height: Math.max(minSize.height, Math.round(viewportHeight * 0.4)) },
      };
  }
}

/**
 * DetachableWindow Component
 */
export function DetachableWindow({
  windowId,
  children,
  className,
  onClose,
}: DetachableWindowProps) {
  const store = useLayoutStore();
  const config = store.detachedWindows.get(windowId);
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Focus on pointer down
  const handleFocus = useCallback(() => {
    store.focusWindow(windowId);
  }, [store, windowId]);

  // Handle drag end
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!config) return;
      const newX = config.position.x + info.offset.x;
      const newY = config.position.y + info.offset.y;

      const { viewportWidth, viewportHeight } = store.dimensions;

      // Edge docking detection: if dragged within 20px of a viewport edge, dock
      const DOCK_THRESHOLD = 20;
      if (newX <= DOCK_THRESHOLD) {
        store.dockWindow(windowId, 'left');
        return;
      }
      if (newX + config.size.width >= viewportWidth - DOCK_THRESHOLD) {
        store.dockWindow(windowId, 'right');
        return;
      }
      if (newY <= DOCK_THRESHOLD) {
        store.dockWindow(windowId, 'top');
        return;
      }
      if (newY + config.size.height >= viewportHeight - DOCK_THRESHOLD) {
        store.dockWindow(windowId, 'bottom');
        return;
      }

      // Normal move - clamp to viewport
      const clampedX = Math.max(0, Math.min(viewportWidth - 40, newX));
      const clampedY = Math.max(0, Math.min(viewportHeight - 40, newY));

      store.updateWindow(windowId, {
        position: { x: clampedX, y: clampedY },
        isDocked: false,
        dockEdge: null,
      });
    },
    [config, store, windowId]
  );

  // Handle close / re-attach
  const handleClose = useCallback(() => {
    store.attachWindow(windowId);
    onClose?.();
  }, [store, windowId, onClose]);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    store.minimizeWindow(windowId);
  }, [store, windowId]);

  // Handle maximize / restore toggle
  const handleMaximizeToggle = useCallback(() => {
    if (!config) return;
    if (config.isMaximized) {
      store.restoreWindow(windowId);
    } else {
      store.maximizeWindow(windowId);
    }
  }, [config, store, windowId]);

  // Handle resize from corner handles
  const handleResize = useCallback(
    (direction: 'nw' | 'ne' | 'sw' | 'se', delta: { x: number; y: number }) => {
      if (!config) return;

      let newWidth = config.size.width;
      let newHeight = config.size.height;
      let newX = config.position.x;
      let newY = config.position.y;

      if (direction.includes('e')) {
        newWidth = config.size.width + delta.x;
      }
      if (direction.includes('w')) {
        newWidth = config.size.width - delta.x;
        newX = config.position.x + delta.x;
      }
      if (direction.includes('s')) {
        newHeight = config.size.height + delta.y;
      }
      if (direction.includes('n')) {
        newHeight = config.size.height - delta.y;
        newY = config.position.y + delta.y;
      }

      newWidth = Math.max(config.minSize.width, Math.min(config.maxSize.width, newWidth));
      newHeight = Math.max(config.minSize.height, Math.min(config.maxSize.height, newHeight));

      store.updateWindow(windowId, {
        size: { width: newWidth, height: newHeight },
        position: { x: newX, y: newY },
      });
    },
    [config, store, windowId]
  );

  if (!config || config.isMinimized) return null;

  // Compute actual position and size based on dock/maximize state
  const { viewportWidth, viewportHeight } = store.dimensions;
  let displayPosition = config.position;
  let displaySize = config.size;

  if (config.isMaximized) {
    displayPosition = { x: 0, y: 0 };
    displaySize = { width: viewportWidth, height: viewportHeight };
  } else if (config.isDocked && config.dockEdge) {
    const docked = getDockedLayout(config.dockEdge, viewportWidth, viewportHeight, config.minSize);
    displayPosition = docked.position;
    displaySize = docked.size;
  }

  const isActive = store.activeWindowId === windowId;

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'fixed flex flex-col',
        'bg-background/95 backdrop-blur-sm',
        'border rounded-lg overflow-hidden',
        isActive ? 'border-primary/50 shadow-2xl' : 'border-border shadow-lg',
        config.isMaximized && 'rounded-none',
        className
      )}
      style={{
        x: displayPosition.x,
        y: displayPosition.y,
        width: displaySize.width,
        height: displaySize.height,
        opacity: config.opacity,
        zIndex: config.zIndex,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: config.opacity, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={LAYOUT_ANIMATIONS.pip}
      onPointerDown={handleFocus}
      drag={!config.isMaximized && !config.isDocked}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      dragListener={false}
    >
      {/* Title bar */}
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          'px-3 py-1.5 border-b',
          isActive ? 'bg-primary/5 border-primary/20' : 'bg-muted/50 border-border',
          'cursor-move select-none shrink-0'
        )}
        onPointerDown={(e) => {
          handleFocus();
          dragControls.start(e);
        }}
        onDoubleClick={handleMaximizeToggle}
      >
        {/* Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground">
            {config.isDocked ? '📎' : '📌'}
          </span>
          <span className="text-sm font-medium truncate">{config.title}</span>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-0.5">
          {/* Undock button (when docked) */}
          {config.isDocked && (
            <WindowControlButton
              onClick={() => store.undockWindow(windowId)}
              title="Undock"
              className="hover:bg-blue-500/20"
            >
              <UndockIcon />
            </WindowControlButton>
          )}

          {/* Minimize */}
          <WindowControlButton
            onClick={handleMinimize}
            title="Minimize"
            className="hover:bg-yellow-500/20"
          >
            <span className="text-2xs leading-none">&#x2500;</span>
          </WindowControlButton>

          {/* Maximize / Restore */}
          <WindowControlButton
            onClick={handleMaximizeToggle}
            title={config.isMaximized ? 'Restore' : 'Maximize'}
            className="hover:bg-green-500/20"
          >
            {config.isMaximized ? (
              <RestoreIcon />
            ) : (
              <span className="inline-block w-2.5 h-2.5 border border-current rounded-[1px]" />
            )}
          </WindowControlButton>

          {/* Close */}
          <WindowControlButton
            onClick={handleClose}
            title="Close"
            className="hover:bg-red-500/20 hover:text-red-400"
          >
            <span className="text-xs leading-none">&#x2715;</span>
          </WindowControlButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">{children}</div>

      {/* Resize handles (hidden when maximized or docked) */}
      {!config.isMaximized && !config.isDocked && (
        <WindowResizeHandles
          onResize={handleResize}
          onResizeStart={() => setIsResizing(true)}
          onResizeEnd={() => setIsResizing(false)}
        />
      )}
    </motion.div>
  );
}

/**
 * Window control button (minimize, maximize, close)
 */
function WindowControlButton({
  children,
  onClick,
  title,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      className={cn(
        'w-6 h-5 rounded-sm flex items-center justify-center',
        'text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
    >
      {children}
    </button>
  );
}

/**
 * Restore icon (overlapping squares)
 */
function RestoreIcon() {
  return (
    <span className="relative inline-block w-2.5 h-2.5">
      <span className="absolute top-0 right-0 w-2 h-2 border border-current rounded-[1px]" />
      <span className="absolute bottom-0 left-0 w-2 h-2 border border-current rounded-[1px] bg-background" />
    </span>
  );
}

/**
 * Undock icon (arrow out of box)
 */
function UndockIcon() {
  return (
    <span className="inline-block w-2.5 h-2.5 border border-current rounded-[1px] relative">
      <span className="absolute -top-0.5 -right-0.5 w-1 h-1 border-t border-r border-current" />
    </span>
  );
}

/**
 * Resize handles for corners and edges
 */
interface WindowResizeHandlesProps {
  onResize: (direction: 'nw' | 'ne' | 'sw' | 'se', delta: { x: number; y: number }) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

function WindowResizeHandles({ onResize, onResizeStart, onResizeEnd }: WindowResizeHandlesProps) {
  const handlePositions = {
    se: 'bottom-0 right-0 cursor-se-resize',
    sw: 'bottom-0 left-0 cursor-sw-resize',
    ne: 'top-0 right-0 cursor-ne-resize',
    nw: 'top-0 left-0 cursor-nw-resize',
  } as const;

  return (
    <>
      {(Object.entries(handlePositions) as [keyof typeof handlePositions, string][]).map(
        ([direction, posClass]) => (
          <motion.div
            key={direction}
            className={cn(
              'absolute w-4 h-4',
              'opacity-0 hover:opacity-100 transition-opacity',
              posClass
            )}
            onPanStart={() => onResizeStart?.()}
            onPan={(_, info) => {
              onResize(direction, { x: info.delta.x, y: info.delta.y });
            }}
            onPanEnd={() => onResizeEnd?.()}
          >
            <div
              className={cn(
                'w-2 h-2 border-current',
                direction === 'se' && 'border-r-2 border-b-2 ml-auto mt-auto',
                direction === 'sw' && 'border-l-2 border-b-2 mr-auto mt-auto',
                direction === 'ne' && 'border-r-2 border-t-2 ml-auto mb-auto',
                direction === 'nw' && 'border-l-2 border-t-2 mr-auto mb-auto'
              )}
            />
          </motion.div>
        )
      )}
    </>
  );
}
