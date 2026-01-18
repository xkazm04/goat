'use client';

/**
 * ResponsiveContainer
 * Breakpoint-aware wrapper component with CSS container queries
 */

import React, { useRef, useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLayout } from '../LayoutManager';
import { BREAKPOINTS, LAYOUT_ANIMATIONS, LAYOUT_CSS_VARS } from '../constants';
import type { Breakpoint } from '../types';

/**
 * ResponsiveContainer Props
 */
interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  /** Render different content for different breakpoints */
  renderForBreakpoint?: Partial<Record<Breakpoint, ReactNode>>;
  /** Minimum height */
  minHeight?: string | number;
  /** Enable container queries */
  useContainerQueries?: boolean;
  /** Container name for CSS container queries */
  containerName?: string;
  /** Callback when breakpoint changes */
  onBreakpointChange?: (breakpoint: Breakpoint) => void;
}

/**
 * ResponsiveContainer Component
 */
export function ResponsiveContainer({
  children,
  className,
  renderForBreakpoint,
  minHeight = 'auto',
  useContainerQueries = true,
  containerName = 'responsive-container',
  onBreakpointChange,
}: ResponsiveContainerProps) {
  const { breakpoint, dimensions, isMobile, isTablet, isDesktop, isUltrawide } =
    useLayout();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerBreakpoint, setContainerBreakpoint] =
    useState<Breakpoint>(breakpoint);

  // Track container-level breakpoints with ResizeObserver
  useEffect(() => {
    if (!useContainerQueries || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        let newBreakpoint: Breakpoint = 'desktop';

        if (width < 400) {
          newBreakpoint = 'mobile';
        } else if (width < 700) {
          newBreakpoint = 'tablet';
        } else if (width < 1200) {
          newBreakpoint = 'desktop';
        } else {
          newBreakpoint = 'ultrawide';
        }

        if (newBreakpoint !== containerBreakpoint) {
          setContainerBreakpoint(newBreakpoint);
          onBreakpointChange?.(newBreakpoint);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [useContainerQueries, containerBreakpoint, onBreakpointChange]);

  // Determine which content to render
  const getContent = (): ReactNode => {
    if (!renderForBreakpoint) return children;

    // Check for specific breakpoint content, fall back through hierarchy
    const effectiveBreakpoint = useContainerQueries
      ? containerBreakpoint
      : breakpoint;

    if (renderForBreakpoint[effectiveBreakpoint]) {
      return renderForBreakpoint[effectiveBreakpoint];
    }

    // Fallback chain: mobile < tablet < desktop < ultrawide
    const fallbackOrder: Breakpoint[] = [
      'mobile',
      'tablet',
      'desktop',
      'ultrawide',
    ];
    const currentIndex = fallbackOrder.indexOf(effectiveBreakpoint);

    for (let i = currentIndex - 1; i >= 0; i--) {
      if (renderForBreakpoint[fallbackOrder[i]]) {
        return renderForBreakpoint[fallbackOrder[i]];
      }
    }

    return children;
  };

  // CSS custom properties for container
  const containerStyle = {
    '--container-width': dimensions.contentWidth,
    '--container-height': dimensions.contentHeight,
    '--grid-columns': BREAKPOINTS[breakpoint].columns,
    minHeight:
      typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
    containerType: useContainerQueries ? 'inline-size' : undefined,
    containerName: useContainerQueries ? containerName : undefined,
  } as React.CSSProperties;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full',
        // Breakpoint-specific classes
        isMobile && 'px-2',
        isTablet && 'px-4',
        isDesktop && 'px-6',
        isUltrawide && 'px-8',
        className
      )}
      style={containerStyle}
      data-breakpoint={breakpoint}
      data-container-breakpoint={containerBreakpoint}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={useContainerQueries ? containerBreakpoint : breakpoint}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={LAYOUT_ANIMATIONS.transition}
          className="w-full h-full"
        >
          {getContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * Responsive visibility components
 */
interface ResponsiveShowProps {
  children: ReactNode;
  /** Show only on these breakpoints */
  on: Breakpoint | Breakpoint[];
  /** Use container queries instead of viewport */
  useContainer?: boolean;
  /** Fallback content when hidden */
  fallback?: ReactNode;
}

export function ResponsiveShow({
  children,
  on,
  useContainer = false,
  fallback = null,
}: ResponsiveShowProps) {
  const { breakpoint } = useLayout();
  const breakpoints = Array.isArray(on) ? on : [on];

  // For container queries, we'd need context from ResponsiveContainer
  // For simplicity, using viewport breakpoint
  const shouldShow = breakpoints.includes(breakpoint);

  return (
    <AnimatePresence mode="wait">
      {shouldShow ? (
        <motion.div
          key="show"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={LAYOUT_ANIMATIONS.transition}
        >
          {children}
        </motion.div>
      ) : fallback ? (
        <motion.div
          key="fallback"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={LAYOUT_ANIMATIONS.transition}
        >
          {fallback}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ResponsiveHide({
  children,
  on,
}: {
  children: ReactNode;
  on: Breakpoint | Breakpoint[];
}) {
  const { breakpoint } = useLayout();
  const breakpoints = Array.isArray(on) ? on : [on];
  const shouldHide = breakpoints.includes(breakpoint);

  if (shouldHide) return null;
  return <>{children}</>;
}

/**
 * Grid responsive component
 */
interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  /** Override column count for each breakpoint */
  columns?: Partial<Record<Breakpoint, number>>;
  /** Gap between items */
  gap?: number;
}

export function ResponsiveGrid({
  children,
  className,
  columns,
  gap = 4,
}: ResponsiveGridProps) {
  const { breakpoint, gridColumns } = useLayout();

  // Get column count - custom or from breakpoint
  const colCount = columns?.[breakpoint] ?? gridColumns;

  return (
    <div
      className={cn('grid w-full', className)}
      style={{
        gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
        gap: `${gap * 4}px`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Stack component that switches between horizontal and vertical
 */
interface ResponsiveStackProps {
  children: ReactNode;
  className?: string;
  /** Breakpoint at which to switch to horizontal */
  horizontalFrom?: Breakpoint;
  /** Gap between items */
  gap?: number;
  /** Alignment */
  align?: 'start' | 'center' | 'end' | 'stretch';
}

export function ResponsiveStack({
  children,
  className,
  horizontalFrom = 'tablet',
  gap = 4,
  align = 'stretch',
}: ResponsiveStackProps) {
  const { breakpoint } = useLayout();

  const breakpointOrder: Breakpoint[] = [
    'mobile',
    'tablet',
    'desktop',
    'ultrawide',
  ];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  const thresholdIndex = breakpointOrder.indexOf(horizontalFrom);
  const isHorizontal = currentIndex >= thresholdIndex;

  const alignmentClasses = {
    start: isHorizontal ? 'items-start' : 'items-stretch',
    center: isHorizontal ? 'items-center' : 'items-stretch',
    end: isHorizontal ? 'items-end' : 'items-stretch',
    stretch: 'items-stretch',
  };

  return (
    <motion.div
      className={cn(
        'flex w-full',
        isHorizontal ? 'flex-row' : 'flex-col',
        alignmentClasses[align],
        className
      )}
      style={{ gap: `${gap * 4}px` }}
      layout
      transition={LAYOUT_ANIMATIONS.panel}
    >
      {children}
    </motion.div>
  );
}
