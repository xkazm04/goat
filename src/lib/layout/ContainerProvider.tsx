'use client';

/**
 * ContainerProvider
 * Container query context provider for component-level responsiveness
 * Enables components to respond to their container size rather than viewport
 */

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { cn } from '@/lib/utils';

/**
 * Container breakpoint names matching Tailwind container query config
 */
export type ContainerBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * Container breakpoint configuration
 */
export interface ContainerBreakpointConfig {
  name: ContainerBreakpoint;
  minWidth: number;
}

/**
 * Container breakpoint values in pixels
 * These match the Tailwind container query config
 */
export const CONTAINER_BREAKPOINTS: Record<ContainerBreakpoint, ContainerBreakpointConfig> = {
  xs: { name: 'xs', minWidth: 320 },
  sm: { name: 'sm', minWidth: 400 },
  md: { name: 'md', minWidth: 500 },
  lg: { name: 'lg', minWidth: 700 },
  xl: { name: 'xl', minWidth: 900 },
  '2xl': { name: '2xl', minWidth: 1200 },
};

/**
 * Get container breakpoint from width
 */
export function getContainerBreakpointFromWidth(width: number): ContainerBreakpoint {
  if (width >= CONTAINER_BREAKPOINTS['2xl'].minWidth) return '2xl';
  if (width >= CONTAINER_BREAKPOINTS.xl.minWidth) return 'xl';
  if (width >= CONTAINER_BREAKPOINTS.lg.minWidth) return 'lg';
  if (width >= CONTAINER_BREAKPOINTS.md.minWidth) return 'md';
  if (width >= CONTAINER_BREAKPOINTS.sm.minWidth) return 'sm';
  return 'xs';
}

/**
 * Container dimensions
 */
export interface ContainerDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Container context value
 */
export interface ContainerContextValue {
  /** Current container breakpoint */
  breakpoint: ContainerBreakpoint;
  /** Container dimensions */
  dimensions: ContainerDimensions;
  /** Container name (for CSS container queries) */
  name: string;
  /** Whether container is narrower than given breakpoint */
  isNarrowerThan: (bp: ContainerBreakpoint) => boolean;
  /** Whether container is wider than given breakpoint */
  isWiderThan: (bp: ContainerBreakpoint) => boolean;
  /** Whether container matches given breakpoint exactly */
  isBreakpoint: (bp: ContainerBreakpoint) => boolean;
  /** Check multiple breakpoints */
  matchesAny: (bps: ContainerBreakpoint[]) => boolean;
  /** Convenience flags */
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  is2Xl: boolean;
}

const ContainerContext = createContext<ContainerContextValue | null>(null);

/**
 * Hook to access container context
 * Throws if used outside ContainerProvider
 */
export function useContainer(): ContainerContextValue {
  const context = useContext(ContainerContext);
  if (!context) {
    throw new Error('useContainer must be used within a ContainerProvider');
  }
  return context;
}

/**
 * Hook to safely access container context
 * Returns null if used outside ContainerProvider (useful for optional container support)
 */
export function useContainerSafe(): ContainerContextValue | null {
  return useContext(ContainerContext);
}

/**
 * ContainerProvider Props
 */
export interface ContainerProviderProps {
  children: ReactNode;
  /** Container name for CSS @container queries */
  name?: string;
  /** Container type: inline-size (width only) or size (width and height) */
  type?: 'inline-size' | 'size';
  /** Additional class names */
  className?: string;
  /** Additional styles */
  style?: CSSProperties;
  /** Callback when breakpoint changes */
  onBreakpointChange?: (breakpoint: ContainerBreakpoint) => void;
  /** Callback when dimensions change */
  onDimensionsChange?: (dimensions: ContainerDimensions) => void;
  /** Minimum width constraint */
  minWidth?: number | string;
  /** Maximum width constraint */
  maxWidth?: number | string;
  /** Debug mode: shows container info overlay */
  debug?: boolean;
}

/**
 * ContainerProvider Component
 * Wraps children in a container query context, providing size information
 * and breakpoint utilities to child components.
 */
export function ContainerProvider({
  children,
  name = 'container',
  type = 'inline-size',
  className,
  style,
  onBreakpointChange,
  onDimensionsChange,
  minWidth,
  maxWidth,
  debug = false,
}: ContainerProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ContainerDimensions>({
    width: 0,
    height: 0,
    aspectRatio: 1,
  });
  const [breakpoint, setBreakpoint] = useState<ContainerBreakpoint>('md');

  // Update dimensions using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const newDimensions: ContainerDimensions = {
          width,
          height,
          aspectRatio: height > 0 ? width / height : 1,
        };

        setDimensions(newDimensions);
        onDimensionsChange?.(newDimensions);

        const newBreakpoint = getContainerBreakpointFromWidth(width);
        if (newBreakpoint !== breakpoint) {
          setBreakpoint(newBreakpoint);
          onBreakpointChange?.(newBreakpoint);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [breakpoint, onBreakpointChange, onDimensionsChange]);

  // Breakpoint comparison utilities
  const breakpointOrder: ContainerBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

  const isNarrowerThan = useCallback(
    (bp: ContainerBreakpoint): boolean => {
      return breakpointOrder.indexOf(breakpoint) < breakpointOrder.indexOf(bp);
    },
    [breakpoint]
  );

  const isWiderThan = useCallback(
    (bp: ContainerBreakpoint): boolean => {
      return breakpointOrder.indexOf(breakpoint) > breakpointOrder.indexOf(bp);
    },
    [breakpoint]
  );

  const isBreakpoint = useCallback(
    (bp: ContainerBreakpoint): boolean => {
      return breakpoint === bp;
    },
    [breakpoint]
  );

  const matchesAny = useCallback(
    (bps: ContainerBreakpoint[]): boolean => {
      return bps.includes(breakpoint);
    },
    [breakpoint]
  );

  // Context value
  const value = useMemo<ContainerContextValue>(
    () => ({
      breakpoint,
      dimensions,
      name,
      isNarrowerThan,
      isWiderThan,
      isBreakpoint,
      matchesAny,
      isXs: breakpoint === 'xs',
      isSm: breakpoint === 'sm',
      isMd: breakpoint === 'md',
      isLg: breakpoint === 'lg',
      isXl: breakpoint === 'xl',
      is2Xl: breakpoint === '2xl',
    }),
    [breakpoint, dimensions, name, isNarrowerThan, isWiderThan, isBreakpoint, matchesAny]
  );

  // Container styles
  const containerStyle: CSSProperties = {
    containerType: type,
    containerName: name,
    minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth,
    maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
    ...style,
  };

  return (
    <ContainerContext.Provider value={value}>
      <div
        ref={containerRef}
        className={cn('relative w-full', className)}
        style={containerStyle}
        data-container={name}
        data-container-breakpoint={breakpoint}
      >
        {children}
        {debug && (
          <ContainerDebugOverlay
            name={name}
            breakpoint={breakpoint}
            dimensions={dimensions}
          />
        )}
      </div>
    </ContainerContext.Provider>
  );
}

/**
 * Debug overlay showing container information
 */
function ContainerDebugOverlay({
  name,
  breakpoint,
  dimensions,
}: {
  name: string;
  breakpoint: ContainerBreakpoint;
  dimensions: ContainerDimensions;
}) {
  return (
    <div
      className={cn(
        'absolute top-1 right-1 z-50',
        'rounded px-2 py-1 text-[10px] font-mono',
        'bg-black/80 text-white pointer-events-none',
        'opacity-80 hover:opacity-100 transition-opacity'
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-yellow-400">{name}</span>
        <span>
          bp: <span className="text-cyan-400">{breakpoint}</span>
        </span>
        <span>
          {Math.round(dimensions.width)} x {Math.round(dimensions.height)}
        </span>
      </div>
    </div>
  );
}

/**
 * Higher-order component to provide container context
 */
export function withContainer<P extends object>(
  Component: React.ComponentType<P>,
  containerProps?: Omit<ContainerProviderProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ContainerProvider {...containerProps}>
      <Component {...props} />
    </ContainerProvider>
  );
  WrappedComponent.displayName = `withContainer(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
}
