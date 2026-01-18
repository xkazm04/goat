'use client';

/**
 * CollapsiblePanel
 * Animated show/hide panel with gesture support
 */

import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLayout, useSidebarState } from '../LayoutManager';
import {
  LAYOUT_ANIMATIONS,
  LAYOUT_Z_INDEX,
  GESTURE_THRESHOLDS,
  SIDEBAR_CONSTRAINTS,
} from '../constants';
import type { PanelState, SidebarPosition } from '../types';

/**
 * CollapsiblePanel Props
 */
interface CollapsiblePanelProps {
  children: ReactNode;
  className?: string;
  /** Panel ID for state management */
  id?: string;
  /** Position of the panel */
  position?: SidebarPosition;
  /** Controlled panel state */
  state?: PanelState;
  /** Default state if uncontrolled */
  defaultState?: PanelState;
  /** Callback when state changes */
  onStateChange?: (state: PanelState) => void;
  /** Width when expanded */
  width?: number;
  /** Enable swipe gestures */
  enableGestures?: boolean;
  /** Show collapse handle */
  showHandle?: boolean;
  /** Handle position */
  handlePosition?: 'inside' | 'outside' | 'edge';
  /** Overlay backdrop on mobile */
  showOverlay?: boolean;
  /** Header content */
  header?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
}

/**
 * CollapsiblePanel Component
 */
export function CollapsiblePanel({
  children,
  className,
  id = 'sidebar',
  position: propPosition,
  state: controlledState,
  defaultState = 'expanded',
  onStateChange,
  width: propWidth,
  enableGestures = true,
  showHandle = true,
  handlePosition = 'edge',
  showOverlay = true,
  header,
  footer,
}: CollapsiblePanelProps) {
  const layout = useLayout();
  const sidebarState = useSidebarState();
  const controls = useAnimation();
  const panelRef = useRef<HTMLDivElement>(null);

  // Use controlled state or fall back to layout state
  const position = propPosition ?? sidebarState.position;
  const width = propWidth ?? sidebarState.width;
  const isControlled = controlledState !== undefined;
  const panelState = isControlled
    ? controlledState
    : sidebarState.state;

  // Local state for uncontrolled mode
  const [localState, setLocalState] = useState<PanelState>(defaultState);
  const effectiveState = isControlled ? panelState : localState;

  // Gesture tracking
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);

  // Toggle handler
  const toggle = useCallback(() => {
    const newState = effectiveState === 'expanded' ? 'collapsed' : 'expanded';
    if (isControlled) {
      onStateChange?.(newState);
    } else {
      setLocalState(newState);
      onStateChange?.(newState);
    }
  }, [effectiveState, isControlled, onStateChange]);

  // Set state handler
  const setState = useCallback(
    (newState: PanelState) => {
      if (isControlled) {
        onStateChange?.(newState);
      } else {
        setLocalState(newState);
        onStateChange?.(newState);
      }
    },
    [isControlled, onStateChange]
  );

  // Pan gesture handlers
  const handlePanStart = useCallback(() => {
    if (!enableGestures) return;
    setIsDragging(true);
    dragStartX.current = 0;
  }, [enableGestures]);

  const handlePan = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!enableGestures || !isDragging) return;

      const offset = info.offset.x;
      const isLeftPanel = position === 'left';
      const isRightPanel = position === 'right';

      // Calculate visual offset based on position
      let translateX = 0;
      if (isLeftPanel) {
        translateX = Math.min(0, Math.max(-width, offset));
      } else if (isRightPanel) {
        translateX = Math.max(0, Math.min(width, offset));
      }

      controls.set({ x: translateX });
    },
    [enableGestures, isDragging, position, width, controls]
  );

  const handlePanEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!enableGestures) return;
      setIsDragging(false);

      const velocity = info.velocity.x;
      const offset = info.offset.x;
      const isLeftPanel = position === 'left';
      const isRightPanel = position === 'right';

      // Determine action based on velocity and offset
      const shouldCollapse =
        Math.abs(velocity) > GESTURE_THRESHOLDS.velocityThreshold * 1000
          ? isLeftPanel
            ? velocity < 0
            : velocity > 0
          : Math.abs(offset) > SIDEBAR_CONSTRAINTS.collapseThreshold;

      const newState = shouldCollapse ? 'collapsed' : 'expanded';
      setState(newState);

      // Animate to final position
      controls.start({
        x: 0,
        transition: LAYOUT_ANIMATIONS.sidebar,
      });
    },
    [enableGestures, position, setState, controls]
  );

  // Animation variants
  const getVariants = () => {
    const isHorizontal = position === 'left' || position === 'right';
    const isVertical = position === 'bottom';

    if (isHorizontal) {
      const hideX = position === 'left' ? -width : width;
      return {
        expanded: { x: 0, opacity: 1 },
        collapsed: { x: hideX, opacity: 0.5 },
        minimized: { x: hideX + 40, opacity: 0.8 },
        hidden: { x: hideX, opacity: 0 },
      };
    }

    if (isVertical) {
      return {
        expanded: { y: 0, opacity: 1 },
        collapsed: { y: 200, opacity: 0.5 },
        minimized: { y: 160, opacity: 0.8 },
        hidden: { y: '100%', opacity: 0 },
      };
    }

    // Floating
    return {
      expanded: { scale: 1, opacity: 1 },
      collapsed: { scale: 0.8, opacity: 0.5 },
      minimized: { scale: 0.6, opacity: 0.8 },
      hidden: { scale: 0, opacity: 0 },
    };
  };

  // Position styles
  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: position === 'floating' ? 'fixed' : 'absolute',
      zIndex: LAYOUT_Z_INDEX.sidebar,
    };

    switch (position) {
      case 'left':
        return { ...base, left: 0, top: 0, bottom: 0, width };
      case 'right':
        return { ...base, right: 0, top: 0, bottom: 0, width };
      case 'bottom':
        return { ...base, left: 0, right: 0, bottom: 0, height: 300 };
      case 'floating':
        return { ...base, right: 20, bottom: 20, width, height: 'auto' };
      default:
        return base;
    }
  };

  return (
    <>
      {/* Overlay backdrop */}
      <AnimatePresence>
        {showOverlay && effectiveState === 'expanded' && layout.isMobile && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-[9]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence mode="wait">
        {effectiveState !== 'hidden' && (
          <motion.div
            ref={panelRef}
            className={cn(
              'flex flex-col bg-background border-border',
              position === 'left' && 'border-r',
              position === 'right' && 'border-l',
              position === 'bottom' && 'border-t',
              position === 'floating' && 'border rounded-lg shadow-xl',
              isDragging && 'cursor-grabbing',
              className
            )}
            style={getPositionStyles()}
            variants={getVariants()}
            initial={effectiveState}
            animate={effectiveState}
            exit="hidden"
            transition={LAYOUT_ANIMATIONS.sidebar}
            onPanStart={handlePanStart}
            onPan={handlePan}
            onPanEnd={handlePanEnd}
          >
            {/* Header */}
            {header && (
              <div className="flex-shrink-0 border-b border-border px-4 py-3">
                {header}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex-shrink-0 border-t border-border px-4 py-3">
                {footer}
              </div>
            )}

            {/* Collapse Handle */}
            {showHandle && (
              <CollapseHandle
                position={position}
                handlePosition={handlePosition}
                isExpanded={effectiveState === 'expanded'}
                onToggle={toggle}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * CollapseHandle Props
 */
interface CollapseHandleProps {
  position: SidebarPosition;
  handlePosition: 'inside' | 'outside' | 'edge';
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * CollapseHandle Component
 */
function CollapseHandle({
  position,
  handlePosition,
  isExpanded,
  onToggle,
}: CollapseHandleProps) {
  const isHorizontal = position === 'left' || position === 'right';

  // Position the handle
  const getHandleStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1,
    };

    if (handlePosition === 'inside') {
      if (position === 'left') return { ...base, right: 8, top: '50%', transform: 'translateY(-50%)' };
      if (position === 'right') return { ...base, left: 8, top: '50%', transform: 'translateY(-50%)' };
      if (position === 'bottom') return { ...base, top: 8, left: '50%', transform: 'translateX(-50%)' };
    }

    if (handlePosition === 'outside') {
      if (position === 'left') return { ...base, right: -32, top: '50%', transform: 'translateY(-50%)' };
      if (position === 'right') return { ...base, left: -32, top: '50%', transform: 'translateY(-50%)' };
      if (position === 'bottom') return { ...base, top: -32, left: '50%', transform: 'translateX(-50%)' };
    }

    // Edge position
    if (position === 'left') return { ...base, right: 0, top: '50%', transform: 'translate(50%, -50%)' };
    if (position === 'right') return { ...base, left: 0, top: '50%', transform: 'translate(-50%, -50%)' };
    if (position === 'bottom') return { ...base, top: 0, left: '50%', transform: 'translate(-50%, -50%)' };

    return base;
  };

  // Arrow direction
  const getArrow = () => {
    if (position === 'left') return isExpanded ? '‹' : '›';
    if (position === 'right') return isExpanded ? '›' : '‹';
    if (position === 'bottom') return isExpanded ? '▼' : '▲';
    return isExpanded ? '−' : '+';
  };

  return (
    <motion.button
      className={cn(
        'flex items-center justify-center',
        'bg-background border border-border rounded-full shadow-sm',
        'hover:bg-accent hover:border-accent-foreground/20',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isHorizontal ? 'w-6 h-12' : 'w-12 h-6'
      )}
      style={getHandleStyles()}
      onClick={onToggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
      aria-expanded={isExpanded}
    >
      <span className="text-xs text-muted-foreground">{getArrow()}</span>
    </motion.button>
  );
}

/**
 * Sidebar component - convenience wrapper for CollapsiblePanel
 */
export function Sidebar({
  children,
  className,
  ...props
}: Omit<CollapsiblePanelProps, 'id'>) {
  const { sidebarPosition, sidebarState, sidebarWidth, toggleSidebar } =
    useLayout();

  return (
    <CollapsiblePanel
      id="sidebar"
      position={sidebarPosition}
      state={sidebarState}
      width={sidebarWidth}
      onStateChange={() => toggleSidebar()}
      className={className}
      {...props}
    >
      {children}
    </CollapsiblePanel>
  );
}
