/**
 * Centralized Animation Utilities
 *
 * This file provides reusable animation class strings for consistent
 * animation behavior across UI components. Reduces duplication and
 * ensures uniform animation timing and effects.
 */

/**
 * Base animation classes for data-state attribute animations
 * Used by Radix UI components (Dialog, Dropdown, Popover, etc.)
 */
export const dataStateAnimations = {
  /** Base fade animations for open/closed states */
  fade: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',

  /** Fade + zoom animations for modals and popovers */
  fadeZoom: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',

  /** Fade + zoom + slide animations for dropdowns with directional awareness */
  fadeZoomSlide: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',

  /** Slide animations for dialog/modal entrance */
  fadeZoomSlideCenter: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
} as const;

/**
 * Accordion-specific animations
 * Used by Accordion components with expand/collapse behavior
 */
export const accordionAnimations = {
  /** Accordion content slide down animation */
  down: 'animate-accordion-down',

  /** Accordion content slide up animation */
  up: 'animate-accordion-up',
} as const;

/**
 * Transition utilities for smooth property changes
 */
export const transitions = {
  /** Transition all properties */
  all: 'transition-all',

  /** Transition colors only (more performant) */
  colors: 'transition-colors',

  /** Transition opacity only */
  opacity: 'transition-opacity',

  /** Transition transform only */
  transform: 'transition-transform',
} as const;

/**
 * Duration utilities for consistent timing
 */
export const durations = {
  /** Fast transitions (150ms) */
  fast: 'duration-150',

  /** Default transitions (200ms) */
  default: 'duration-200',

  /** Medium transitions (300ms) */
  medium: 'duration-300',

  /** Slow transitions (500ms) */
  slow: 'duration-500',
} as const;

/**
 * Common animation combinations for specific use cases
 */
export const animationPresets = {
  /** Dialog/Modal overlay animation */
  dialogOverlay: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',

  /** Dialog/Modal content animation */
  dialogContent: 'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',

  /** Dropdown/Popover menu content animation */
  dropdownContent: 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',

  /** Hover transition for interactive elements */
  hoverTransition: 'transition-colors duration-200',

  /** Focus ring transition */
  focusTransition: 'transition-opacity duration-200',

  /** Smooth background/border transitions */
  surfaceTransition: 'transition-all duration-300',
} as const;

/**
 * Helper function to combine animation classes
 * @param animations - Array of animation class strings to combine
 * @returns Combined animation class string
 */
export function combineAnimations(...animations: string[]): string {
  return animations.filter(Boolean).join(' ');
}

/**
 * Type-safe animation class getter
 */
export type DataStateAnimation = keyof typeof dataStateAnimations;
export type AccordionAnimation = keyof typeof accordionAnimations;
export type Transition = keyof typeof transitions;
export type Duration = keyof typeof durations;
export type AnimationPreset = keyof typeof animationPresets;
