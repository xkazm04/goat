/**
 * 3D Effects and Animation Components
 *
 * Parallax scrolling and ambient floating elements for the landing page.
 * Both respect the motion tier from `useMotionCapabilities` (ambient motion
 * is off under the `reduced` and `minimal` tiers).
 *
 * 2026-09-05: Card3D, InteractivePreview and ReducedMotionProvider were
 * removed from this package — zero importers outside it since the barrel was
 * created (grep + knip). This barrel exports exactly what is consumed.
 */

export { ParallaxSection, ParallaxLayer } from './ParallaxSection';
export { FloatingElements, FloatingPresets } from './FloatingElements';
