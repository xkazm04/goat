'use client';

/**
 * ResponsiveWrapper
 * Container query-aware wrapper component with fluid typography
 * and dynamic breakpoint support for component-level responsiveness
 */

import React, { type ReactNode, type CSSProperties, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ContainerProvider,
  useContainer,
  useContainerSafe,
  type ContainerBreakpoint,
  type ContainerProviderProps,
} from '@/lib/layout/ContainerProvider';
import {
  resolveResponsiveValue,
  type ResponsiveValue,
  fluidTypeScale,
  fluidContainerTypeScale,
  cssUtils,
  supportsContainerQueries,
} from '@/lib/layout/responsive-utils';

/**
 * ResponsiveWrapper Props
 */
export interface ResponsiveWrapperProps extends Omit<ContainerProviderProps, 'children' | 'maxWidth'> {
  children: ReactNode;
  /** Responsive padding values */
  padding?: ResponsiveValue<number>;
  /** Responsive gap values */
  gap?: ResponsiveValue<number>;
  /** Container max-width (passed to ContainerProvider) */
  containerMaxWidth?: number | string;
  /** Content max-width (responsive values) */
  contentMaxWidth?: ResponsiveValue<number | string>;
  /** Enable fluid typography scale */
  fluidTypography?: boolean;
  /** Typography scale to use */
  typographyScale?: keyof typeof fluidTypeScale;
  /** Center content horizontally */
  center?: boolean;
  /** Full height */
  fullHeight?: boolean;
  /** As grid container */
  asGrid?: boolean;
  /** Responsive grid columns */
  columns?: ResponsiveValue<number>;
  /** Show content only on specific breakpoints */
  showOn?: ContainerBreakpoint[];
  /** Hide content on specific breakpoints */
  hideOn?: ContainerBreakpoint[];
  /** Render different content for different breakpoints */
  renderForBreakpoint?: Partial<Record<ContainerBreakpoint, ReactNode>>;
  /** Fallback for unsupported browsers */
  fallback?: ReactNode;
  /** Enable progressive enhancement */
  progressiveEnhancement?: boolean;
}

/**
 * Content component props
 */
interface ResponsiveWrapperContentProps {
  children: ReactNode;
  padding?: ResponsiveValue<number>;
  gap?: ResponsiveValue<number>;
  contentMaxWidth?: ResponsiveValue<number | string>;
  fluidTypography?: boolean;
  typographyScale?: keyof typeof fluidTypeScale;
  center?: boolean;
  fullHeight?: boolean;
  asGrid?: boolean;
  columns?: ResponsiveValue<number>;
  showOn?: ContainerBreakpoint[];
  hideOn?: ContainerBreakpoint[];
  renderForBreakpoint?: Partial<Record<ContainerBreakpoint, ReactNode>>;
  fallback?: ReactNode;
  progressiveEnhancement?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Inner content component that uses container context
 */
function ResponsiveWrapperContent({
  children,
  padding,
  gap,
  contentMaxWidth,
  fluidTypography = false,
  typographyScale = 'base',
  center = false,
  fullHeight = false,
  asGrid = false,
  columns,
  showOn,
  hideOn,
  renderForBreakpoint,
  fallback,
  progressiveEnhancement = true,
  className,
  style,
}: ResponsiveWrapperContentProps) {
  const container = useContainerSafe();
  const breakpoint = container?.breakpoint ?? 'md';

  // Check visibility conditions
  const isVisible = useMemo(() => {
    if (showOn && !showOn.includes(breakpoint)) return false;
    if (hideOn && hideOn.includes(breakpoint)) return false;
    return true;
  }, [breakpoint, showOn, hideOn]);

  // Get content for current breakpoint
  const content = useMemo(() => {
    if (renderForBreakpoint?.[breakpoint]) {
      return renderForBreakpoint[breakpoint];
    }
    return children;
  }, [breakpoint, renderForBreakpoint, children]);

  // Resolve responsive values
  const resolvedPadding = resolveResponsiveValue(padding, breakpoint, 0);
  const resolvedGap = resolveResponsiveValue(gap, breakpoint, 0);
  const resolvedMaxWidth = resolveResponsiveValue(contentMaxWidth, breakpoint, undefined);
  const resolvedColumns = resolveResponsiveValue(columns, breakpoint, 1);

  // Build styles
  const wrapperStyle = useMemo<CSSProperties>(() => {
    const baseStyle: CSSProperties = {
      ...style,
    };

    if (resolvedPadding) {
      baseStyle.padding = `${resolvedPadding * 4}px`;
    }

    if (resolvedGap) {
      baseStyle.gap = `${resolvedGap * 4}px`;
    }

    if (resolvedMaxWidth) {
      baseStyle.maxWidth = typeof resolvedMaxWidth === 'number'
        ? `${resolvedMaxWidth}px`
        : resolvedMaxWidth;
    }

    if (fluidTypography) {
      const containerScale = fluidContainerTypeScale[typographyScale as keyof typeof fluidContainerTypeScale];
      baseStyle.fontSize = containerScale ?? fluidTypeScale[typographyScale];
    }

    if (asGrid && resolvedColumns) {
      baseStyle.display = 'grid';
      baseStyle.gridTemplateColumns = `repeat(${resolvedColumns}, minmax(0, 1fr))`;
    }

    return baseStyle;
  }, [
    style,
    resolvedPadding,
    resolvedGap,
    resolvedMaxWidth,
    fluidTypography,
    typographyScale,
    asGrid,
    resolvedColumns,
  ]) as CSSProperties;

  // Check for container query support
  const hasContainerSupport = useMemo(() => {
    if (typeof window === 'undefined') return true; // SSR fallback
    return supportsContainerQueries();
  }, []);

  // Return fallback for unsupported browsers if progressive enhancement is disabled
  if (!hasContainerSupport && !progressiveEnhancement && fallback) {
    return <>{fallback}</>;
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'w-full',
        center && 'mx-auto',
        fullHeight && 'h-full min-h-full',
        asGrid && 'grid',
        className
      )}
      style={wrapperStyle}
      data-responsive-breakpoint={breakpoint}
    >
      {content}
    </div>
  );
}

/**
 * ResponsiveWrapper Component
 * Wraps content in a container query context with responsive utilities
 *
 * @example
 * ```tsx
 * <ResponsiveWrapper
 *   name="card"
 *   padding={{ xs: 2, md: 4, lg: 6 }}
 *   fluidTypography
 *   asGrid
 *   columns={{ xs: 1, sm: 2, lg: 3 }}
 * >
 *   <GridItem />
 *   <GridItem />
 *   <GridItem />
 * </ResponsiveWrapper>
 * ```
 */
export function ResponsiveWrapper({
  children,
  name = 'responsive-wrapper',
  type = 'inline-size',
  className,
  style,
  onBreakpointChange,
  onDimensionsChange,
  minWidth,
  containerMaxWidth,
  debug,
  // Content props
  padding,
  gap,
  contentMaxWidth,
  fluidTypography,
  typographyScale,
  center,
  fullHeight,
  asGrid,
  columns,
  showOn,
  hideOn,
  renderForBreakpoint,
  fallback,
  progressiveEnhancement,
}: ResponsiveWrapperProps) {
  return (
    <ContainerProvider
      name={name}
      type={type}
      className={className}
      style={style}
      onBreakpointChange={onBreakpointChange}
      onDimensionsChange={onDimensionsChange}
      minWidth={minWidth}
      maxWidth={containerMaxWidth}
      debug={debug}
    >
      <ResponsiveWrapperContent
        padding={padding}
        gap={gap}
        contentMaxWidth={contentMaxWidth}
        fluidTypography={fluidTypography}
        typographyScale={typographyScale}
        center={center}
        fullHeight={fullHeight}
        asGrid={asGrid}
        columns={columns}
        showOn={showOn}
        hideOn={hideOn}
        renderForBreakpoint={renderForBreakpoint}
        fallback={fallback}
        progressiveEnhancement={progressiveEnhancement}
      >
        {children}
      </ResponsiveWrapperContent>
    </ContainerProvider>
  );
}

/**
 * ContainerShow - Show content only when container matches breakpoints
 */
export interface ContainerShowProps {
  children: ReactNode;
  on: ContainerBreakpoint | ContainerBreakpoint[];
  fallback?: ReactNode;
}

export function ContainerShow({ children, on, fallback = null }: ContainerShowProps) {
  const container = useContainerSafe();
  const breakpoint = container?.breakpoint ?? 'md';
  const breakpoints = Array.isArray(on) ? on : [on];
  const shouldShow = breakpoints.includes(breakpoint);

  return <>{shouldShow ? children : fallback}</>;
}

/**
 * ContainerHide - Hide content when container matches breakpoints
 */
export interface ContainerHideProps {
  children: ReactNode;
  on: ContainerBreakpoint | ContainerBreakpoint[];
}

export function ContainerHide({ children, on }: ContainerHideProps) {
  const container = useContainerSafe();
  const breakpoint = container?.breakpoint ?? 'md';
  const breakpoints = Array.isArray(on) ? on : [on];
  const shouldHide = breakpoints.includes(breakpoint);

  if (shouldHide) return null;
  return <>{children}</>;
}

/**
 * FluidText - Text with fluid typography
 */
export interface FluidTextProps {
  children: ReactNode;
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
  scale?: keyof typeof fluidTypeScale;
  useContainerUnits?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function FluidText({
  children,
  as: Component = 'p',
  scale = 'base',
  useContainerUnits = false,
  className,
  style,
}: FluidTextProps) {
  const fontSize = useContainerUnits
    ? fluidContainerTypeScale[scale as keyof typeof fluidContainerTypeScale] ?? fluidTypeScale[scale]
    : fluidTypeScale[scale];

  return (
    <Component
      className={cn('transition-[font-size] duration-200', className)}
      style={{ fontSize, ...style }}
    >
      {children}
    </Component>
  );
}

/**
 * ContainerGrid - Grid that responds to container size
 */
export interface ContainerGridProps {
  children: ReactNode;
  columns?: ResponsiveValue<number>;
  gap?: ResponsiveValue<number>;
  minItemWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export function ContainerGrid({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = { xs: 2, md: 4 },
  minItemWidth,
  className,
  style,
}: ContainerGridProps) {
  const container = useContainerSafe();
  const breakpoint = container?.breakpoint ?? 'md';

  const resolvedColumns = resolveResponsiveValue(columns, breakpoint, 1);
  const resolvedGap = resolveResponsiveValue(gap, breakpoint, 4);

  const gridStyle = useMemo<CSSProperties>(() => {
    const base: CSSProperties = {
      display: 'grid',
      gap: `${resolvedGap * 4}px`,
      ...style,
    };

    if (minItemWidth) {
      // Auto-fit with minimum item width
      base.gridTemplateColumns = `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`;
    } else {
      base.gridTemplateColumns = `repeat(${resolvedColumns}, minmax(0, 1fr))`;
    }

    return base;
  }, [resolvedColumns, resolvedGap, minItemWidth, style]);

  return (
    <div className={cn('w-full', className)} style={gridStyle}>
      {children}
    </div>
  );
}

/**
 * Hook to get responsive value based on container context
 */
export function useResponsiveValue<T>(
  value: ResponsiveValue<T>,
  fallback: T
): T {
  const container = useContainerSafe();
  const breakpoint = container?.breakpoint ?? 'md';
  return resolveResponsiveValue(value, breakpoint, fallback);
}

/**
 * Hook to get multiple responsive values
 */
export function useResponsiveValues<T>(
  values: Record<string, ResponsiveValue<T>>,
  fallbacks: Record<string, T>
): Record<string, T> {
  const container = useContainerSafe();
  const breakpoint = container?.breakpoint ?? 'md';

  return useMemo(() => {
    const result: Record<string, T> = {};
    for (const key in values) {
      result[key] = resolveResponsiveValue(values[key], breakpoint, fallbacks[key]);
    }
    return result;
  }, [values, fallbacks, breakpoint]);
}
