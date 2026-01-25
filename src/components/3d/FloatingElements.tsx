'use client';

/**
 * FloatingElements - Ambient floating animations
 *
 * Creates decorative floating elements with configurable patterns,
 * colors, and animation behaviors. Fully respects reduced motion
 * preferences.
 */

import { memo, useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionCapabilities } from '@/hooks/use-motion-preference';

// =============================================================================
// Types
// =============================================================================

export type FloatingPattern = 'random' | 'grid' | 'orbital' | 'wave' | 'spiral';
export type FloatingShape = 'circle' | 'square' | 'triangle' | 'star' | 'custom';

export interface FloatingElement {
  /** Unique identifier */
  id: string;
  /** X position (0-100 percent) */
  x: number;
  /** Y position (0-100 percent) */
  y: number;
  /** Size in pixels */
  size: number;
  /** Shape type */
  shape: FloatingShape;
  /** Color (CSS color value) */
  color: string;
  /** Opacity (0-1) */
  opacity: number;
  /** Animation delay in seconds */
  delay: number;
  /** Animation duration in seconds */
  duration: number;
  /** Custom element (if shape is 'custom') */
  customElement?: ReactNode;
}

export interface FloatingElementsProps {
  /** Number of elements to generate (default: 20) */
  count?: number;
  /** Distribution pattern (default: 'random') */
  pattern?: FloatingPattern;
  /** Element shapes (default: ['circle']) */
  shapes?: FloatingShape[];
  /** Color palette (default: cyan/blue) */
  colors?: string[];
  /** Min/max size in pixels (default: [4, 12]) */
  sizeRange?: [number, number];
  /** Min/max opacity (default: [0.1, 0.3]) */
  opacityRange?: [number, number];
  /** Min/max animation duration in seconds (default: [10, 20]) */
  durationRange?: [number, number];
  /** Float distance in pixels (default: 30) */
  floatDistance?: number;
  /** Custom elements to render instead of generated ones */
  elements?: FloatingElement[];
  /** Container class name */
  className?: string;
  /** Z-index for positioning */
  zIndex?: number;
  /** Enable blur effect on elements */
  enableBlur?: boolean;
  /** Disable animations */
  disabled?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function generateElements(
  count: number,
  pattern: FloatingPattern,
  shapes: FloatingShape[],
  colors: string[],
  sizeRange: [number, number],
  opacityRange: [number, number],
  durationRange: [number, number]
): FloatingElement[] {
  const random = seededRandom(42); // Consistent seed for SSR
  const elements: FloatingElement[] = [];

  for (let i = 0; i < count; i++) {
    let x: number, y: number;

    switch (pattern) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(count));
        const row = Math.floor(i / cols);
        const col = i % cols;
        x = (col / cols) * 100 + random() * 10;
        y = (row / Math.ceil(count / cols)) * 100 + random() * 10;
        break;
      }
      case 'orbital': {
        const angle = (i / count) * Math.PI * 2;
        const radius = 30 + random() * 20;
        x = 50 + Math.cos(angle) * radius;
        y = 50 + Math.sin(angle) * radius;
        break;
      }
      case 'wave': {
        x = (i / count) * 100;
        y = 50 + Math.sin((i / count) * Math.PI * 2) * 30 + random() * 10;
        break;
      }
      case 'spiral': {
        const t = i / count;
        const spiralAngle = t * Math.PI * 4;
        const spiralRadius = 10 + t * 40;
        x = 50 + Math.cos(spiralAngle) * spiralRadius;
        y = 50 + Math.sin(spiralAngle) * spiralRadius;
        break;
      }
      case 'random':
      default:
        x = random() * 100;
        y = random() * 100;
    }

    elements.push({
      id: `floating-${i}`,
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      size: sizeRange[0] + random() * (sizeRange[1] - sizeRange[0]),
      shape: shapes[Math.floor(random() * shapes.length)],
      color: colors[Math.floor(random() * colors.length)],
      opacity: opacityRange[0] + random() * (opacityRange[1] - opacityRange[0]),
      delay: random() * 5,
      duration: durationRange[0] + random() * (durationRange[1] - durationRange[0]),
    });
  }

  return elements;
}

// =============================================================================
// Shape Renderers
// =============================================================================

const ShapeRenderers: Record<
  Exclude<FloatingShape, 'custom'>,
  (size: number, color: string) => ReactNode
> = {
  circle: (size, color) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
      }}
    />
  ),
  square: (size, color) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.15,
        background: color,
      }}
    />
  ),
  triangle: (size, color) => (
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size}px solid ${color}`,
      }}
    />
  ),
  star: (size, color) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={color}
      />
    </svg>
  ),
};

// =============================================================================
// Floating Element Component
// =============================================================================

const FloatingElementItem = memo(function FloatingElementItem({
  element,
  floatDistance,
  enableBlur,
  disabled,
}: {
  element: FloatingElement;
  floatDistance: number;
  enableBlur: boolean;
  disabled: boolean;
}) {
  const { allowAmbient } = useMotionCapabilities();
  const shouldAnimate = !disabled && allowAmbient;

  return (
    <motion.div
      key={element.id}
      className="absolute pointer-events-none"
      style={{
        left: `${element.x}%`,
        top: `${element.y}%`,
        opacity: element.opacity,
        filter: enableBlur ? `blur(${element.size * 0.2}px)` : undefined,
      }}
      initial={false}
      animate={
        shouldAnimate
          ? {
              y: [0, -floatDistance, 0],
              x: [0, floatDistance * 0.3, 0],
              scale: [1, 1.1, 1],
              rotate: [0, 10, 0],
            }
          : {}
      }
      transition={
        shouldAnimate
          ? {
              duration: element.duration,
              delay: element.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : { duration: 0 }
      }
    >
      {element.shape === 'custom' && element.customElement
        ? element.customElement
        : ShapeRenderers[element.shape as Exclude<FloatingShape, 'custom'>](
            element.size,
            element.color
          )}
    </motion.div>
  );
});

// =============================================================================
// Main Component
// =============================================================================

export const FloatingElements = memo(function FloatingElements({
  count = 20,
  pattern = 'random',
  shapes = ['circle'],
  colors = ['rgba(6, 182, 212, 0.6)', 'rgba(59, 130, 246, 0.6)'],
  sizeRange = [4, 12],
  opacityRange = [0.1, 0.3],
  durationRange = [10, 20],
  floatDistance = 30,
  elements: customElements,
  className,
  zIndex = 0,
  enableBlur = true,
  disabled = false,
}: FloatingElementsProps) {
  const { allowAmbient } = useMotionCapabilities();

  // Generate or use custom elements
  const elements = useMemo(
    () =>
      customElements ??
      generateElements(
        count,
        pattern,
        shapes,
        colors,
        sizeRange,
        opacityRange,
        durationRange
      ),
    [count, pattern, shapes, colors, sizeRange, opacityRange, durationRange, customElements]
  );

  // Don't render if motion is disabled and no static fallback needed
  if (!allowAmbient && !disabled) {
    return null;
  }

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}
      style={{ zIndex }}
      aria-hidden="true"
    >
      {elements.map((element) => (
        <FloatingElementItem
          key={element.id}
          element={element}
          floatDistance={floatDistance}
          enableBlur={enableBlur}
          disabled={disabled || !allowAmbient}
        />
      ))}
    </div>
  );
});

// =============================================================================
// Preset Configurations
// =============================================================================

export const FloatingPresets = {
  /** Soft cyan/blue particles */
  ocean: {
    colors: ['rgba(6, 182, 212, 0.5)', 'rgba(14, 165, 233, 0.4)', 'rgba(59, 130, 246, 0.3)'],
    shapes: ['circle'] as FloatingShape[],
    sizeRange: [3, 10] as [number, number],
    opacityRange: [0.1, 0.25] as [number, number],
  },
  /** Warm orange/pink particles */
  sunset: {
    colors: ['rgba(251, 146, 60, 0.5)', 'rgba(244, 114, 182, 0.4)', 'rgba(249, 115, 22, 0.3)'],
    shapes: ['circle', 'square'] as FloatingShape[],
    sizeRange: [4, 14] as [number, number],
    opacityRange: [0.15, 0.3] as [number, number],
  },
  /** Sparkle/star effect */
  sparkle: {
    colors: ['rgba(255, 255, 255, 0.6)', 'rgba(250, 204, 21, 0.5)', 'rgba(192, 132, 252, 0.4)'],
    shapes: ['star', 'circle'] as FloatingShape[],
    sizeRange: [2, 8] as [number, number],
    opacityRange: [0.2, 0.5] as [number, number],
    durationRange: [5, 12] as [number, number],
  },
  /** Dark/moody particles */
  nebula: {
    colors: ['rgba(139, 92, 246, 0.4)', 'rgba(99, 102, 241, 0.3)', 'rgba(168, 85, 247, 0.35)'],
    shapes: ['circle'] as FloatingShape[],
    sizeRange: [6, 20] as [number, number],
    opacityRange: [0.08, 0.2] as [number, number],
    enableBlur: true,
  },
};

export default FloatingElements;
