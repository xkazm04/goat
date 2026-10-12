/**
 * Animation Utilities Module
 *
 * Re-exports the scroll-triggered reveal hooks and variants (scroll-triggers),
 * the canonical DURATION / EASE / SPRING ladders and reduced-motion helpers
 * (motion-presets), and the choreography tokens (motion-tokens).
 *
 * NOT re-exported, by design: `./micro-interactions` and `./sharing` — each
 * declares its own `STAGGER` and `cardEntranceVariants`, and `./sharing`'s
 * `staggerContainerVariants` collides with the one from scroll-triggers.
 * Consumers import those two modules by path. There is no parallax helper in
 * this module; the header claimed one until 2026-09-05.
 */

export * from './scroll-triggers';
export * from './motion-presets';
export * from './motion-tokens';
