// Drop Zone Feature - Grid slot components for drag-and-drop ranking

// Main drop zone component
export { SimpleDropZone } from './SimpleDropZone';

// Sub-components
export { DropZoneCard, ActiveSelectionRing, HoverGlowBorder, ItemTitle } from './components/DropZoneCard';
export { DropZoneEmpty, RankNumberBackground, HoloGridPattern } from './components/DropZoneEmpty';
export { DropZoneOccupied } from './components/DropZoneOccupied';
export { DropCelebration } from './components/DropCelebration';
export { MagneticGlowAura, ValidDropIndicator, SnapConfirmationGlow } from './components/MagneticGlowAura';

// Hooks
// `useMagneticSnap` was re-exported here and consumed by NO component. This
// barrel line was its only reference, which is the shadow-declaration shape:
// every reference-counting instrument certified it alive. Deleted 2026-08-24
// together with its duplicate in src/components/patterns/drag-drop/.
//
// STILL LIVE, and sharing this vocabulary: drop-zone-highlight-store's
// `magneticState` / `updateMagneticState`, read by DropZoneHighlightContext.tsx.
// That slice is a separate decision — do not finish the job on it here.
