'use client';

/**
 * FloatingPanel
 * Detachable floating panel component.
 * Supports dragging, resizing, and docking back to the layout.
 */

import React, {
  memo,
  useCallback,
  useRef,
  useState,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  X,
  Minimize2,
  Maximize2,
  GripHorizontal,
  Pin,
  PinOff,
} from 'lucide-react';
import { usePanelStore, PanelConfig } from '@/stores/panel-store';
import { PanelManager } from './PanelManager';

/**
 * Props for FloatingPanel component
 */
export interface FloatingPanelProps {
  /** Panel configuration */
  panel: PanelConfig;
  /** Children to render inside panel */
  children: React.ReactNode;
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Maximum height */
  maxHeight?: number;
  /** Enable resizing */
  resizable?: boolean;
  /** Show dock button */
  showDockButton?: boolean;
  /** Show pin button (keep on top) */
  showPinButton?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom header content */
  headerContent?: React.ReactNode;
}

/**
 * Resize handle positions
 */
type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

/**
 * FloatingPanel Component
 *
 * A detachable floating panel that can be moved and resized.
 * Uses React Portal to render outside the normal DOM hierarchy.
 *
 * Features:
 * - Drag to move
 * - Resize from edges/corners
 * - Minimize/maximize
 * - Dock back to layout
 * - Pin to stay on top
 * - Portal rendering
 */
export const FloatingPanel = memo(function FloatingPanel({
  panel,
  children,
  minWidth = 280,
  minHeight = 200,
  maxWidth = 800,
  maxHeight = 800,
  resizable = true,
  showDockButton = true,
  showPinButton = true,
  className,
  headerContent,
}: FloatingPanelProps) {
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(panel.isMinimized);

  const updatePanel = usePanelStore((state) => state.updatePanel);
  const setActivePanel = usePanelStore((state) => state.setActivePanel);
  const activePanelId = usePanelStore((state) => state.activePanelId);

  const isActive = activePanelId === panel.id;

  // Initial position and size
  const position = panel.floatingPosition || { x: 100, y: 100 };
  const size = panel.floatingSize || { width: 400, height: 500 };

  // Handle drag end
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const newPosition = {
        x: position.x + info.offset.x,
        y: position.y + info.offset.y,
      };
      PanelManager.updateFloatingPosition(panel.id, newPosition);
    },
    [panel.id, position]
  );

  // Handle resize
  const handleResize = useCallback(
    (handle: ResizeHandle, deltaX: number, deltaY: number) => {
      let newWidth = size.width;
      let newHeight = size.height;
      let newX = position.x;
      let newY = position.y;

      // Calculate new dimensions based on handle
      if (handle.includes('e')) {
        newWidth = Math.max(minWidth, Math.min(maxWidth, size.width + deltaX));
      }
      if (handle.includes('w')) {
        const widthDelta = Math.max(minWidth, Math.min(maxWidth, size.width - deltaX)) - size.width;
        newWidth = size.width + widthDelta;
        newX = position.x - widthDelta;
      }
      if (handle.includes('s')) {
        newHeight = Math.max(minHeight, Math.min(maxHeight, size.height + deltaY));
      }
      if (handle.includes('n')) {
        const heightDelta = Math.max(minHeight, Math.min(maxHeight, size.height - deltaY)) - size.height;
        newHeight = size.height + heightDelta;
        newY = position.y - heightDelta;
      }

      updatePanel(panel.id, {
        floatingSize: { width: newWidth, height: newHeight },
        floatingPosition: { x: newX, y: newY },
      });
    },
    [panel.id, size, position, minWidth, minHeight, maxWidth, maxHeight, updatePanel]
  );

  // Handle dock
  const handleDock = useCallback(() => {
    PanelManager.dockPanel(panel.id);
  }, [panel.id]);

  // Handle close
  const handleClose = useCallback(() => {
    PanelManager.removePanel(panel.id);
  }, [panel.id]);

  // Handle minimize
  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
    updatePanel(panel.id, { isMinimized: true });
  }, [panel.id, updatePanel]);

  // Handle maximize
  const handleMaximize = useCallback(() => {
    setIsMinimized(false);
    updatePanel(panel.id, { isMinimized: false });
  }, [panel.id, updatePanel]);

  // Handle activate
  const handleActivate = useCallback(() => {
    setActivePanel(panel.id);
  }, [panel.id, setActivePanel]);

  // Resize handle component
  const ResizeHandle = ({
    position,
    cursor,
  }: {
    position: ResizeHandle;
    cursor: string;
  }) => {
    const startPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startPos.current = { x: e.clientX, y: e.clientY };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startPos.current.x;
        const deltaY = moveEvent.clientY - startPos.current.y;
        handleResize(position, deltaX, deltaY);
        startPos.current = { x: moveEvent.clientX, y: moveEvent.clientY };
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    const positionClasses: Record<ResizeHandle, string> = {
      n: 'top-0 left-2 right-2 h-1 cursor-n-resize',
      ne: 'top-0 right-0 w-3 h-3 cursor-ne-resize',
      e: 'top-2 right-0 bottom-2 w-1 cursor-e-resize',
      se: 'bottom-0 right-0 w-3 h-3 cursor-se-resize',
      s: 'bottom-0 left-2 right-2 h-1 cursor-s-resize',
      sw: 'bottom-0 left-0 w-3 h-3 cursor-sw-resize',
      w: 'top-2 left-0 bottom-2 w-1 cursor-w-resize',
      nw: 'top-0 left-0 w-3 h-3 cursor-nw-resize',
    };

    return (
      <div
        className={cn(
          'absolute z-10 hover:bg-cyan-500/30 transition-colors',
          positionClasses[position]
        )}
        onMouseDown={handleMouseDown}
        style={{ cursor }}
      />
    );
  };

  // Render in portal
  const panelContent = (
    <motion.div
      ref={containerRef}
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragListener={false}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: position.x,
        y: position.y,
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={handleActivate}
      className={cn(
        'fixed z-[100] flex flex-col',
        'bg-gray-900 border rounded-lg shadow-2xl',
        'overflow-hidden',
        isActive ? 'border-cyan-500/50 shadow-cyan-500/10' : 'border-gray-700',
        isPinned && 'z-[200]',
        isResizing && 'select-none',
        className
      )}
      style={{
        width: isMinimized ? 200 : size.width,
        height: isMinimized ? 'auto' : size.height,
      }}
      data-testid={`floating-panel-${panel.id}`}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 border-b cursor-move',
          'bg-gray-800/50',
          isActive ? 'border-cyan-500/30' : 'border-gray-700/50'
        )}
        onPointerDown={(e) => dragControls.start(e)}
      >
        {/* Drag handle */}
        <GripHorizontal className="w-4 h-4 text-gray-500 flex-shrink-0" />

        {/* Color indicator */}
        {panel.color && (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: panel.color }}
          />
        )}

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-white truncate">
          {panel.title}
        </span>

        {/* Custom header content */}
        {headerContent}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {showPinButton && (
            <button
              onClick={() => setIsPinned((prev) => !prev)}
              className={cn(
                'p-1 rounded hover:bg-gray-700 transition-colors',
                isPinned ? 'text-cyan-400' : 'text-gray-400'
              )}
              title={isPinned ? 'Unpin' : 'Pin on top'}
            >
              {isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
            </button>
          )}

          {showDockButton && (
            <button
              onClick={handleDock}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Dock panel"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={isMinimized ? handleMaximize : handleMinimize}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title={isMinimized ? 'Expand' : 'Collapse'}
          >
            {isMinimized ? (
              <Maximize2 className="w-3 h-3" />
            ) : (
              <Minimize2 className="w-3 h-3" />
            )}
          </button>

          <button
            onClick={handleClose}
            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
            title="Close panel"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      )}

      {/* Resize handles */}
      {resizable && !isMinimized && (
        <>
          <ResizeHandle position="n" cursor="n-resize" />
          <ResizeHandle position="ne" cursor="ne-resize" />
          <ResizeHandle position="e" cursor="e-resize" />
          <ResizeHandle position="se" cursor="se-resize" />
          <ResizeHandle position="s" cursor="s-resize" />
          <ResizeHandle position="sw" cursor="sw-resize" />
          <ResizeHandle position="w" cursor="w-resize" />
          <ResizeHandle position="nw" cursor="nw-resize" />
        </>
      )}
    </motion.div>
  );

  // Use portal for floating panels
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(panelContent, document.body);
});

export default FloatingPanel;
