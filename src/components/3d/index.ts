/**
 * 3D Effects and Animation Components
 *
 * Interactive 3D card effects, parallax scrolling, floating elements,
 * and preview modals. All components respect reduced motion preferences.
 */

// Core 3D components
export { Card3D, Card3DLayer, type Card3DProps, type Card3DLayerProps } from './Card3D';
export {
  ParallaxSection,
  ParallaxLayer,
  useViewportParallax,
  type ParallaxSectionProps,
  type ParallaxLayerProps,
} from './ParallaxSection';

// Interactive components
export {
  InteractivePreview,
  QuickPreview,
  type InteractivePreviewProps,
  type QuickPreviewProps,
} from './InteractivePreview';

// Decorative components
export {
  FloatingElements,
  FloatingPresets,
  type FloatingElementsProps,
  type FloatingElement,
  type FloatingPattern,
  type FloatingShape,
} from './FloatingElements';

// Accessibility
export {
  ReducedMotionProvider,
  useReducedMotion,
  MotionGate,
  NoMotionWrapper,
  type ReducedMotionContextValue,
  type ReducedMotionProviderProps,
  type MotionGateProps,
  type NoMotionWrapperProps,
} from './ReducedMotionProvider';
