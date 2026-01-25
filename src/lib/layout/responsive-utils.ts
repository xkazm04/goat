/**
 * Responsive Utilities
 * Fluid typography, dynamic breakpoints, and responsive prop utilities
 * Uses CSS clamp() for smooth scaling between breakpoints
 */

import type { ContainerBreakpoint } from './ContainerProvider';
import { CONTAINER_BREAKPOINTS } from './ContainerProvider';

/**
 * Fluid typography scale configuration
 */
export interface FluidTypographyConfig {
  /** Minimum font size in rem */
  minSize: number;
  /** Maximum font size in rem */
  maxSize: number;
  /** Minimum viewport/container width in px */
  minWidth?: number;
  /** Maximum viewport/container width in px */
  maxWidth?: number;
}

/**
 * Generate CSS clamp() value for fluid typography
 * Creates smooth scaling between min and max sizes
 *
 * @param config - Fluid typography configuration
 * @returns CSS clamp() string
 *
 * @example
 * ```tsx
 * const fontSize = fluidTypography({ minSize: 1, maxSize: 2 });
 * // Returns: "clamp(1rem, 0.5rem + 2.5vw, 2rem)"
 * ```
 */
export function fluidTypography({
  minSize,
  maxSize,
  minWidth = 320,
  maxWidth = 1200,
}: FluidTypographyConfig): string {
  // Calculate the slope of the linear scaling
  const slope = (maxSize - minSize) / (maxWidth - minWidth);
  // Calculate the y-intercept
  const intercept = minSize - slope * minWidth;

  // Convert slope to viewport units (vw)
  const slopeVw = slope * 100;
  // Convert intercept to rem (assuming 16px base)
  const interceptRem = intercept;

  return `clamp(${minSize}rem, ${interceptRem.toFixed(4)}rem + ${slopeVw.toFixed(4)}vw, ${maxSize}rem)`;
}

/**
 * Generate container-query-aware fluid value
 * Uses cqi (container inline size) units instead of vw
 *
 * @param config - Fluid configuration
 * @returns CSS clamp() string using container query units
 */
export function fluidContainer({
  minSize,
  maxSize,
  minWidth = 320,
  maxWidth = 1200,
}: FluidTypographyConfig): string {
  const slope = (maxSize - minSize) / (maxWidth - minWidth);
  const intercept = minSize - slope * minWidth;
  const slopeCqi = slope * 100;
  const interceptRem = intercept;

  return `clamp(${minSize}rem, ${interceptRem.toFixed(4)}rem + ${slopeCqi.toFixed(4)}cqi, ${maxSize}rem)`;
}

/**
 * Predefined fluid typography scale
 * Based on a modular scale with fluid scaling
 */
export const fluidTypeScale = {
  /** 12px - 14px */
  xs: fluidTypography({ minSize: 0.75, maxSize: 0.875 }),
  /** 14px - 16px */
  sm: fluidTypography({ minSize: 0.875, maxSize: 1 }),
  /** 16px - 18px */
  base: fluidTypography({ minSize: 1, maxSize: 1.125 }),
  /** 18px - 20px */
  lg: fluidTypography({ minSize: 1.125, maxSize: 1.25 }),
  /** 20px - 24px */
  xl: fluidTypography({ minSize: 1.25, maxSize: 1.5 }),
  /** 24px - 30px */
  '2xl': fluidTypography({ minSize: 1.5, maxSize: 1.875 }),
  /** 30px - 36px */
  '3xl': fluidTypography({ minSize: 1.875, maxSize: 2.25 }),
  /** 36px - 48px */
  '4xl': fluidTypography({ minSize: 2.25, maxSize: 3 }),
  /** 48px - 60px */
  '5xl': fluidTypography({ minSize: 3, maxSize: 3.75 }),
  /** 60px - 72px */
  '6xl': fluidTypography({ minSize: 3.75, maxSize: 4.5 }),
} as const;

/**
 * Container-aware fluid typography scale
 */
export const fluidContainerTypeScale = {
  xs: fluidContainer({ minSize: 0.75, maxSize: 0.875 }),
  sm: fluidContainer({ minSize: 0.875, maxSize: 1 }),
  base: fluidContainer({ minSize: 1, maxSize: 1.125 }),
  lg: fluidContainer({ minSize: 1.125, maxSize: 1.25 }),
  xl: fluidContainer({ minSize: 1.25, maxSize: 1.5 }),
  '2xl': fluidContainer({ minSize: 1.5, maxSize: 1.875 }),
  '3xl': fluidContainer({ minSize: 1.875, maxSize: 2.25 }),
  '4xl': fluidContainer({ minSize: 2.25, maxSize: 3 }),
} as const;

/**
 * Fluid spacing scale using CSS clamp()
 */
export const fluidSpacing = {
  /** 4px - 8px */
  '1': 'clamp(0.25rem, 0.15rem + 0.5vw, 0.5rem)',
  /** 8px - 12px */
  '2': 'clamp(0.5rem, 0.35rem + 0.75vw, 0.75rem)',
  /** 12px - 16px */
  '3': 'clamp(0.75rem, 0.5rem + 1.25vw, 1rem)',
  /** 16px - 24px */
  '4': 'clamp(1rem, 0.65rem + 1.75vw, 1.5rem)',
  /** 24px - 32px */
  '6': 'clamp(1.5rem, 1rem + 2.5vw, 2rem)',
  /** 32px - 48px */
  '8': 'clamp(2rem, 1.25rem + 3.75vw, 3rem)',
  /** 48px - 64px */
  '12': 'clamp(3rem, 2rem + 5vw, 4rem)',
  /** 64px - 96px */
  '16': 'clamp(4rem, 2.5rem + 7.5vw, 6rem)',
} as const;

/**
 * Responsive prop value type
 * Allows setting different values for different breakpoints
 */
export type ResponsiveValue<T> = T | Partial<Record<ContainerBreakpoint, T>>;

/**
 * Resolve a responsive value to its actual value for a given breakpoint
 *
 * @param value - Responsive value (either direct value or breakpoint map)
 * @param breakpoint - Current container breakpoint
 * @param fallback - Fallback value if no match found
 * @returns Resolved value
 *
 * @example
 * ```tsx
 * const columns = resolveResponsiveValue(
 *   { xs: 1, sm: 2, lg: 3 },
 *   'md',
 *   1
 * );
 * // Returns 2 (falls back to 'sm' since no 'md' specified)
 * ```
 */
export function resolveResponsiveValue<T>(
  value: ResponsiveValue<T>,
  breakpoint: ContainerBreakpoint,
  fallback: T
): T {
  // Direct value - return as-is
  if (
    typeof value !== 'object' ||
    value === null ||
    !isBreakpointObject(value)
  ) {
    return value as T;
  }

  // Breakpoint object - find matching value
  const breakpointOrder: ContainerBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  // Check from current breakpoint down to find a value
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (value[bp] !== undefined) {
      return value[bp]!;
    }
  }

  return fallback;
}

/**
 * Type guard to check if value is a breakpoint object
 */
function isBreakpointObject<T>(value: unknown): value is Partial<Record<ContainerBreakpoint, T>> {
  if (typeof value !== 'object' || value === null) return false;
  const breakpoints: ContainerBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  return Object.keys(value).some(key => breakpoints.includes(key as ContainerBreakpoint));
}

/**
 * Generate responsive CSS custom properties from a responsive value
 *
 * @param name - CSS variable name (without --)
 * @param value - Responsive value
 * @returns Object of CSS custom properties
 */
export function responsiveCSSVars<T extends string | number>(
  name: string,
  value: ResponsiveValue<T>
): Record<string, T> {
  if (!isBreakpointObject(value)) {
    return { [`--${name}`]: value as T };
  }

  const result: Record<string, T> = {};
  const breakpointOrder: ContainerBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

  for (const bp of breakpointOrder) {
    if ((value as Partial<Record<ContainerBreakpoint, T>>)[bp] !== undefined) {
      result[`--${name}-${bp}`] = (value as Partial<Record<ContainerBreakpoint, T>>)[bp]!;
    }
  }

  return result;
}

/**
 * Generate Tailwind container query classes from responsive values
 *
 * @param property - Tailwind property prefix (e.g., 'grid-cols', 'gap')
 * @param value - Responsive value mapping breakpoints to class values
 * @returns Space-separated class string
 *
 * @example
 * ```tsx
 * const classes = containerQueryClasses('grid-cols', {
 *   xs: 1,
 *   sm: 2,
 *   lg: 3,
 * });
 * // Returns: "@xs:grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3"
 * ```
 */
export function containerQueryClasses(
  property: string,
  value: Partial<Record<ContainerBreakpoint, string | number>>
): string {
  return Object.entries(value)
    .map(([bp, val]) => `@${bp}:${property}-${val}`)
    .join(' ');
}

/**
 * Generate responsive grid columns classes
 */
export function responsiveGridCols(
  value: Partial<Record<ContainerBreakpoint, number>>
): string {
  return containerQueryClasses('grid-cols', value);
}

/**
 * Generate responsive gap classes
 */
export function responsiveGap(
  value: Partial<Record<ContainerBreakpoint, number>>
): string {
  return containerQueryClasses('gap', value);
}

/**
 * Dynamic breakpoint registry for runtime breakpoint management
 */
export class DynamicBreakpoints {
  private breakpoints: Map<string, number> = new Map();
  private listeners: Set<(breakpoints: Map<string, number>) => void> = new Set();

  constructor(initialBreakpoints?: Record<string, number>) {
    if (initialBreakpoints) {
      for (const [name, value] of Object.entries(initialBreakpoints)) {
        this.breakpoints.set(name, value);
      }
    }
  }

  /**
   * Register a new breakpoint
   */
  register(name: string, width: number): void {
    this.breakpoints.set(name, width);
    this.notifyListeners();
  }

  /**
   * Remove a breakpoint
   */
  unregister(name: string): void {
    this.breakpoints.delete(name);
    this.notifyListeners();
  }

  /**
   * Get breakpoint value
   */
  get(name: string): number | undefined {
    return this.breakpoints.get(name);
  }

  /**
   * Get all breakpoints sorted by width
   */
  getAll(): Array<{ name: string; width: number }> {
    return Array.from(this.breakpoints.entries())
      .map(([name, width]) => ({ name, width }))
      .sort((a, b) => a.width - b.width);
  }

  /**
   * Find matching breakpoint for a given width
   */
  match(width: number): string | null {
    const sorted = this.getAll();
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (width >= sorted[i].width) {
        return sorted[i].name;
      }
    }
    return sorted[0]?.name ?? null;
  }

  /**
   * Subscribe to breakpoint changes
   */
  subscribe(listener: (breakpoints: Map<string, number>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.breakpoints);
    });
  }

  /**
   * Generate CSS media queries for all registered breakpoints
   */
  generateMediaQueries(): string {
    const sorted = this.getAll();
    return sorted
      .map(({ name, width }) => `@media (min-width: ${width}px) { .${name}\\:hidden { display: none; } }`)
      .join('\n');
  }

  /**
   * Generate CSS container queries for all registered breakpoints
   */
  generateContainerQueries(containerName?: string): string {
    const sorted = this.getAll();
    const container = containerName ? ` ${containerName}` : '';
    return sorted
      .map(({ name, width }) => `@container${container} (min-width: ${width}px) { .${name}\\:hidden { display: none; } }`)
      .join('\n');
  }
}

/**
 * Default dynamic breakpoints instance with container query breakpoints
 */
export const defaultBreakpoints = new DynamicBreakpoints(
  Object.fromEntries(
    Object.entries(CONTAINER_BREAKPOINTS).map(([name, config]) => [name, config.minWidth])
  )
);

/**
 * CSS utility functions for responsive design
 */
export const cssUtils = {
  /**
   * Create a CSS clamp value for any unit
   */
  clamp(min: string, preferred: string, max: string): string {
    return `clamp(${min}, ${preferred}, ${max})`;
  },

  /**
   * Create a minmax() value for CSS Grid
   */
  minmax(min: string, max: string): string {
    return `minmax(${min}, ${max})`;
  },

  /**
   * Create a calc() expression
   */
  calc(expression: string): string {
    return `calc(${expression})`;
  },

  /**
   * Create a min() expression
   */
  min(...values: string[]): string {
    return `min(${values.join(', ')})`;
  },

  /**
   * Create a max() expression
   */
  max(...values: string[]): string {
    return `max(${values.join(', ')})`;
  },

  /**
   * Generate container query variable with fallback
   */
  cqVar(name: string, fallback: string): string {
    return `var(--${name}, ${fallback})`;
  },
};

/**
 * Browser support detection for container queries
 */
export function supportsContainerQueries(): boolean {
  if (typeof window === 'undefined') return false;
  return CSS.supports('container-type', 'inline-size');
}

/**
 * Check if browser supports specific CSS features
 */
export const featureSupport = {
  containerQueries: () => supportsContainerQueries(),
  cssClamp: () => typeof window !== 'undefined' && CSS.supports('font-size', 'clamp(1rem, 2vw, 3rem)'),
  cssGrid: () => typeof window !== 'undefined' && CSS.supports('display', 'grid'),
  cssSubgrid: () => typeof window !== 'undefined' && CSS.supports('grid-template-columns', 'subgrid'),
  cssHas: () => typeof window !== 'undefined' && CSS.supports('selector(:has(*))'),
};
