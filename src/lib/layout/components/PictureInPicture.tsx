'use client';

/**
 * PictureInPicture
 * Floating item detail panel component
 */

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { motion, PanInfo, useDragControls, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePictureInPicture, useLayout } from '../LayoutManager';
import { LAYOUT_ANIMATIONS, LAYOUT_Z_INDEX, DEFAULT_PIP_CONFIG } from '../constants';
import type { PipConfig } from '../types';

/**
 * PictureInPicture Props
 */
interface PictureInPictureProps {
  children: ReactNode;
  className?: string;
  /** Override default config */
  config?: Partial<PipConfig>;
  /** Title in header */
  title?: string;
  /** Show close button */
  showClose?: boolean;
  /** Show dock buttons */
  showDockButtons?: boolean;
  /** Minimum size */
  minSize?: { width: number; height: number };
  /** Maximum size */
  maxSize?: { width: number; height: number };
  /** Callback when closed */
  onClose?: () => void;
  /** Callback when docked */
  onDock?: (position: PipConfig['dockPosition']) => void;
}

/**
 * PictureInPicture Component
 */
export function PictureInPicture({
  children,
  className,
  config: configOverride,
  title,
  showClose = true,
  showDockButtons = true,
  minSize = { width: 200, height: 150 },
  maxSize = { width: 600, height: 500 },
  onClose,
  onDock,
}: PictureInPictureProps) {
  const { dimensions } = useLayout();
  const { config, setEnabled, setPosition, dock } = usePictureInPicture();
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);

  // Merge config with overrides
  const pipConfig: PipConfig = {
    ...DEFAULT_PIP_CONFIG,
    ...config,
    ...configOverride,
  };

  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState(pipConfig.size);

  // Get dock position coordinates
  const getDockPosition = useCallback(
    (dockPos: PipConfig['dockPosition']) => {
      const padding = 20;
      const { viewportWidth, viewportHeight } = dimensions;

      switch (dockPos) {
        case 'top-left':
          return { x: padding, y: padding };
        case 'top-right':
          return { x: viewportWidth - size.width - padding, y: padding };
        case 'bottom-left':
          return { x: padding, y: viewportHeight - size.height - padding };
        case 'bottom-right':
          return {
            x: viewportWidth - size.width - padding,
            y: viewportHeight - size.height - padding,
          };
        default:
          return { x: padding, y: padding };
      }
    },
    [dimensions, size]
  );

  // Current position
  const position = pipConfig.isDocked
    ? getDockPosition(pipConfig.dockPosition)
    : pipConfig.position;

  // Handle drag
  const handleDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const newX = position.x + info.offset.x;
      const newY = position.y + info.offset.y;

      // Keep within viewport bounds
      const clampedX = Math.max(
        0,
        Math.min(dimensions.viewportWidth - size.width, newX)
      );
      const clampedY = Math.max(
        0,
        Math.min(dimensions.viewportHeight - size.height, newY)
      );

      setPosition(clampedX, clampedY);
    },
    [position, dimensions, size, setPosition]
  );

  // Handle dock
  const handleDock = useCallback(
    (dockPosition: PipConfig['dockPosition']) => {
      dock(dockPosition);
      onDock?.(dockPosition);
    },
    [dock, onDock]
  );

  // Handle close
  const handleClose = useCallback(() => {
    setEnabled(false);
    onClose?.();
  }, [setEnabled, onClose]);

  // Handle resize
  const handleResize = useCallback(
    (direction: 'nw' | 'ne' | 'sw' | 'se', delta: { x: number; y: number }) => {
      setSize((prev) => {
        let newWidth = prev.width;
        let newHeight = prev.height;

        if (direction.includes('e')) {
          newWidth = Math.max(minSize.width, Math.min(maxSize.width, prev.width + delta.x));
        }
        if (direction.includes('w')) {
          newWidth = Math.max(minSize.width, Math.min(maxSize.width, prev.width - delta.x));
        }
        if (direction.includes('s')) {
          newHeight = Math.max(minSize.height, Math.min(maxSize.height, prev.height + delta.y));
        }
        if (direction.includes('n')) {
          newHeight = Math.max(minSize.height, Math.min(maxSize.height, prev.height - delta.y));
        }

        return { width: newWidth, height: newHeight };
      });
    },
    [minSize, maxSize]
  );

  if (!pipConfig.enabled) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className={cn(
          'fixed flex flex-col',
          'bg-background/95 backdrop-blur-sm',
          'border border-border rounded-lg shadow-2xl',
          'overflow-hidden',
          className
        )}
        style={{
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
          opacity: pipConfig.opacity,
          zIndex: LAYOUT_Z_INDEX.pip,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: pipConfig.opacity, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={LAYOUT_ANIMATIONS.pip}
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0.1}
        onDrag={handleDrag}
        dragListener={false}
      >
        {/* Header */}
        <motion.div
          className={cn(
            'flex items-center justify-between gap-2',
            'px-3 py-2 bg-muted/50 border-b border-border',
            'cursor-move select-none'
          )}
          onPointerDown={(e) => dragControls.start(e)}
        >
          {/* Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">📌</span>
            {title && (
              <span className="text-sm font-medium truncate">{title}</span>
            )}
          </div>

          {/* Controls */}
          {pipConfig.showControls && (
            <div className="flex items-center gap-1">
              {/* Dock buttons */}
              {showDockButtons && (
                <div className="flex gap-0.5">
                  {(
                    [
                      'top-left',
                      'top-right',
                      'bottom-left',
                      'bottom-right',
                    ] as const
                  ).map((pos) => (
                    <button
                      key={pos}
                      className={cn(
                        'w-4 h-4 rounded-sm transition-colors',
                        'hover:bg-accent',
                        pipConfig.isDocked &&
                          pipConfig.dockPosition === pos &&
                          'bg-primary/20'
                      )}
                      onClick={() => handleDock(pos)}
                      title={`Dock ${pos.replace('-', ' ')}`}
                    >
                      <DockIcon position={pos} />
                    </button>
                  ))}
                </div>
              )}

              {/* Close button */}
              {showClose && (
                <button
                  className={cn(
                    'w-5 h-5 rounded flex items-center justify-center',
                    'text-muted-foreground hover:text-foreground hover:bg-accent',
                    'transition-colors'
                  )}
                  onClick={handleClose}
                  title="Close"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Content */}
        <div className="flex-1 overflow-auto">{children}</div>

        {/* Resize handles */}
        <ResizeHandles
          onResize={handleResize}
          onResizeStart={() => setIsResizing(true)}
          onResizeEnd={() => setIsResizing(false)}
        />
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Dock Icon Component
 */
function DockIcon({ position }: { position: PipConfig['dockPosition'] }) {
  const dotPosition = {
    'top-left': 'top-0.5 left-0.5',
    'top-right': 'top-0.5 right-0.5',
    'bottom-left': 'bottom-0.5 left-0.5',
    'bottom-right': 'bottom-0.5 right-0.5',
  };

  return (
    <div className="relative w-full h-full border border-current/30 rounded-sm">
      <div
        className={cn(
          'absolute w-1 h-1 bg-current rounded-full',
          dotPosition[position]
        )}
      />
    </div>
  );
}

/**
 * Resize Handles Component
 */
interface ResizeHandlesProps {
  onResize: (
    direction: 'nw' | 'ne' | 'sw' | 'se',
    delta: { x: number; y: number }
  ) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

function ResizeHandles({
  onResize,
  onResizeStart,
  onResizeEnd,
}: ResizeHandlesProps) {
  const handlePositions = {
    se: 'bottom-0 right-0 cursor-se-resize',
    sw: 'bottom-0 left-0 cursor-sw-resize',
    ne: 'top-0 right-0 cursor-ne-resize',
    nw: 'top-0 left-0 cursor-nw-resize',
  } as const;

  return (
    <>
      {(Object.entries(handlePositions) as [keyof typeof handlePositions, string][]).map(
        ([direction, className]) => (
          <motion.div
            key={direction}
            className={cn(
              'absolute w-4 h-4',
              'opacity-0 hover:opacity-100 transition-opacity',
              className
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

/**
 * PiP Toggle Button
 */
interface PipToggleButtonProps {
  className?: string;
  children?: ReactNode;
}

export function PipToggleButton({ className, children }: PipToggleButtonProps) {
  const { config, setEnabled } = usePictureInPicture();

  return (
    <motion.button
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5',
        'rounded-md border transition-colors',
        config.enabled
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background border-border hover:bg-accent',
        className
      )}
      onClick={() => setEnabled(!config.enabled)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={config.enabled ? 'Disable PiP' : 'Enable PiP'}
    >
      <span className="text-sm">📌</span>
      {children || <span className="text-sm">PiP</span>}
    </motion.button>
  );
}

/**
 * usePip hook - simplified PiP control
 */
export function usePip() {
  const { config, setEnabled, setPosition, dock } = usePictureInPicture();

  return {
    isEnabled: config.enabled,
    isDocked: config.isDocked,
    dockPosition: config.dockPosition,
    position: config.position,
    size: config.size,
    opacity: config.opacity,

    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    toggle: () => setEnabled(!config.enabled),
    move: setPosition,
    dock,
  };
}
