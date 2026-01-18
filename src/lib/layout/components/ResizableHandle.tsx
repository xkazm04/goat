'use client';

/**
 * ResizableHandle
 * Drag-to-resize panels component
 */

import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLayout } from '../LayoutManager';
import { SIDEBAR_CONSTRAINTS, LAYOUT_ANIMATIONS } from '../constants';
import type { ResizeEvent } from '../types';

/**
 * ResizableHandle Props
 */
interface ResizableHandleProps {
  /** Direction of resize */
  direction: 'horizontal' | 'vertical';
  /** Position of handle relative to panel */
  position: 'start' | 'end';
  /** Current size */
  size: number;
  /** Minimum size */
  minSize?: number;
  /** Maximum size */
  maxSize?: number;
  /** Snap points for size */
  snapPoints?: number[];
  /** Snap threshold in pixels */
  snapThreshold?: number;
  /** Callback when size changes */
  onResize: (newSize: number) => void;
  /** Callback when resize starts */
  onResizeStart?: () => void;
  /** Callback when resize ends */
  onResizeEnd?: (finalSize: number) => void;
  /** Custom handle content */
  children?: ReactNode;
  /** Additional className */
  className?: string;
  /** Handle style variant */
  variant?: 'default' | 'minimal' | 'dot' | 'line';
  /** Show visual indicator */
  showIndicator?: boolean;
}

/**
 * ResizableHandle Component
 */
export function ResizableHandle({
  direction,
  position,
  size,
  minSize = SIDEBAR_CONSTRAINTS.minWidth,
  maxSize = SIDEBAR_CONSTRAINTS.maxWidth,
  snapPoints = [...SIDEBAR_CONSTRAINTS.snapPoints],
  snapThreshold = 15,
  onResize,
  onResizeStart,
  onResizeEnd,
  children,
  className,
  variant = 'default',
  showIndicator = true,
}: ResizableHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const startSize = useRef(size);
  const handleRef = useRef<HTMLDivElement>(null);

  // Motion values for smooth animations
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Visual feedback during drag
  const handleScale = useTransform(
    direction === 'horizontal' ? dragX : dragY,
    [-50, 0, 50],
    [0.9, 1, 0.9]
  );

  // Find nearest snap point
  const findSnapPoint = useCallback(
    (value: number): number => {
      if (!snapPoints.length) return value;

      let nearest = value;
      let minDistance = Infinity;

      for (const point of snapPoints) {
        const distance = Math.abs(value - point);
        if (distance < snapThreshold && distance < minDistance) {
          minDistance = distance;
          nearest = point;
        }
      }

      return nearest;
    },
    [snapPoints, snapThreshold]
  );

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsResizing(true);
    startSize.current = size;
    onResizeStart?.();
  }, [size, onResizeStart]);

  // Handle drag
  const handleDrag = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const delta =
        direction === 'horizontal' ? info.offset.x : info.offset.y;

      // Invert delta based on position
      const adjustedDelta = position === 'start' ? -delta : delta;

      let newSize = startSize.current + adjustedDelta;

      // Clamp to min/max
      newSize = Math.max(minSize, Math.min(maxSize, newSize));

      // Apply snap
      newSize = findSnapPoint(newSize);

      onResize(newSize);
    },
    [direction, position, minSize, maxSize, findSnapPoint, onResize]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsResizing(false);

      const delta =
        direction === 'horizontal' ? info.offset.x : info.offset.y;
      const adjustedDelta = position === 'start' ? -delta : delta;
      let finalSize = Math.max(
        minSize,
        Math.min(maxSize, startSize.current + adjustedDelta)
      );
      finalSize = findSnapPoint(finalSize);

      onResizeEnd?.(finalSize);

      // Reset motion values
      dragX.set(0);
      dragY.set(0);
    },
    [
      direction,
      position,
      minSize,
      maxSize,
      findSnapPoint,
      onResizeEnd,
      dragX,
      dragY,
    ]
  );

  // Handle indicator styles
  const getIndicatorStyles = () => {
    const isHorizontal = direction === 'horizontal';

    switch (variant) {
      case 'minimal':
        return {
          width: isHorizontal ? 2 : '100%',
          height: isHorizontal ? '100%' : 2,
        };
      case 'dot':
        return {
          width: 8,
          height: 8,
          borderRadius: '50%',
        };
      case 'line':
        return {
          width: isHorizontal ? 1 : 24,
          height: isHorizontal ? 24 : 1,
          borderRadius: 1,
        };
      default:
        return {
          width: isHorizontal ? 4 : 24,
          height: isHorizontal ? 24 : 4,
          borderRadius: 2,
        };
    }
  };

  return (
    <motion.div
      ref={handleRef}
      className={cn(
        'relative flex items-center justify-center',
        'touch-none select-none',
        direction === 'horizontal'
          ? 'w-2 h-full cursor-ew-resize hover:w-3'
          : 'w-full h-2 cursor-ns-resize hover:h-3',
        'transition-all duration-150',
        isResizing && 'bg-primary/10',
        isHovering && 'bg-accent/50',
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onPanStart={handleDragStart}
      onPan={handleDrag}
      onPanEnd={handleDragEnd}
      style={{ scale: handleScale }}
      role="separator"
      aria-orientation={direction}
      aria-valuenow={size}
      aria-valuemin={minSize}
      aria-valuemax={maxSize}
      tabIndex={0}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 50 : 10;
        if (direction === 'horizontal') {
          if (e.key === 'ArrowLeft') onResize(findSnapPoint(size - step));
          if (e.key === 'ArrowRight') onResize(findSnapPoint(size + step));
        } else {
          if (e.key === 'ArrowUp') onResize(findSnapPoint(size - step));
          if (e.key === 'ArrowDown') onResize(findSnapPoint(size + step));
        }
      }}
    >
      {/* Custom content or default indicator */}
      {children || (
        showIndicator && (
          <motion.div
            className={cn(
              'bg-border',
              (isResizing || isHovering) && 'bg-primary'
            )}
            style={getIndicatorStyles()}
            animate={{
              scale: isResizing ? 1.2 : isHovering ? 1.1 : 1,
              opacity: isResizing ? 1 : isHovering ? 0.8 : 0.5,
            }}
            transition={LAYOUT_ANIMATIONS.transition}
          />
        )
      )}

      {/* Resize preview line during drag */}
      {isResizing && (
        <motion.div
          className={cn(
            'absolute bg-primary/30',
            direction === 'horizontal'
              ? 'w-px h-screen top-1/2 -translate-y-1/2'
              : 'h-px w-screen left-1/2 -translate-x-1/2'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </motion.div>
  );
}

/**
 * ResizablePanel - Panel with integrated resize handle
 */
interface ResizablePanelProps {
  children: ReactNode;
  className?: string;
  /** Direction panel can be resized */
  resizeDirection: 'horizontal' | 'vertical';
  /** Side where resize handle appears */
  handleSide: 'start' | 'end';
  /** Initial size */
  initialSize?: number;
  /** Minimum size */
  minSize?: number;
  /** Maximum size */
  maxSize?: number;
  /** Callback when size changes */
  onSizeChange?: (size: number) => void;
  /** Handle variant */
  handleVariant?: 'default' | 'minimal' | 'dot' | 'line';
}

export function ResizablePanel({
  children,
  className,
  resizeDirection,
  handleSide,
  initialSize = 320,
  minSize,
  maxSize,
  onSizeChange,
  handleVariant = 'default',
}: ResizablePanelProps) {
  const [size, setSize] = useState(initialSize);
  const [isResizing, setIsResizing] = useState(false);

  const handleResize = useCallback(
    (newSize: number) => {
      setSize(newSize);
      onSizeChange?.(newSize);
    },
    [onSizeChange]
  );

  const sizeStyle =
    resizeDirection === 'horizontal'
      ? { width: size, minWidth: minSize, maxWidth: maxSize }
      : { height: size, minHeight: minSize, maxHeight: maxSize };

  return (
    <motion.div
      className={cn(
        'relative flex',
        resizeDirection === 'horizontal' ? 'flex-row' : 'flex-col',
        handleSide === 'start' && 'flex-row-reverse',
        className
      )}
      style={sizeStyle}
      layout
      transition={isResizing ? { duration: 0 } : LAYOUT_ANIMATIONS.panel}
    >
      {/* Content */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Handle */}
      <ResizableHandle
        direction={resizeDirection}
        position={handleSide}
        size={size}
        minSize={minSize}
        maxSize={maxSize}
        onResize={handleResize}
        onResizeStart={() => setIsResizing(true)}
        onResizeEnd={() => setIsResizing(false)}
        variant={handleVariant}
      />
    </motion.div>
  );
}

/**
 * SidebarResizeHandle - Convenience component for sidebar resize
 */
export function SidebarResizeHandle() {
  const { sidebarWidth, setSidebarWidth, sidebarPosition } = useLayout();

  const handlePosition =
    sidebarPosition === 'left' || sidebarPosition === 'bottom'
      ? 'end'
      : 'start';

  return (
    <ResizableHandle
      direction={sidebarPosition === 'bottom' ? 'vertical' : 'horizontal'}
      position={handlePosition}
      size={sidebarWidth}
      onResize={setSidebarWidth}
      variant="line"
    />
  );
}
