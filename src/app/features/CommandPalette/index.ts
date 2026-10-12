// The feature's public surface is what other features actually import through
// this barrel. As of 2026-09-05 that is one name (LandingMain renders the
// trigger); the provider is mounted by DeferredProviders through a deep import
// so it can be code-split, and everything else is internal. Thirteen barrel
// re-exports with zero importers (knip: unusedExports) were removed rather than
// kept as an API nobody had asked for.
export { CommandPaletteTrigger } from "./CommandPaletteTrigger";
