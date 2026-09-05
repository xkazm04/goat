'use client';

// dev-css-var-check.ts
// Dev-mode guard: warn when a design token the components depend on is missing
// from :root. It has to run IN THE BROWSER to see computed styles, so it is a
// client module rendered by the root layout (<DevCssVarCheck />), not a call
// from the layout's module scope — that scope is a server component and never
// executes in a browser, which is where the previous version silently lived.

import { useEffect } from 'react';

/**
 * Every custom property design-tokens.css declares on :root. Kept as a literal
 * so the browser check needs no CSS parsing; src/app/dev-css-var-check.test.ts
 * fails if this list and the stylesheet disagree in either direction.
 */
export const REQUIRED_CSS_VARS = [
  // Surface
  '--surface-card',
  '--surface-card-hover',
  '--surface-deep',
  '--surface-overlay',
  // Border
  '--border-card',
  '--border-card-subtle',
  '--border-card-hover',
  // Radius hierarchy
  '--radius-container',
  '--radius-card',
  '--radius-control',
  '--radius-badge',
  // Interaction state
  '--focus-ring',
  '--focus-offset',
  '--hover-overlay',
  '--active-overlay',
  '--disabled-opacity',
  '--placeholder-color',
  // Icon colour
  '--icon-default',
  '--icon-muted',
  '--icon-active',
  '--icon-danger',
  // Elevation
  '--elevation-card',
  '--elevation-modal',
  // Brand glow
  '--glow-brand-sm',
  '--glow-brand-md',
  '--glow-brand-lg',
  // Brand gradient
  '--gradient-brand',
  // Motion duration
  '--duration-instant',
  '--duration-quick',
  '--duration-normal',
  '--duration-slow',
] as const;

/**
 * Returns the tokens that resolve to nothing on `root`, warning once if any do.
 * Pure with respect to the environment: the caller decides when to run it.
 */
export function checkCssVariableContract(root: Element = document.documentElement): string[] {
  const computed = getComputedStyle(root);
  const missing = REQUIRED_CSS_VARS.filter((v) => computed.getPropertyValue(v).trim() === '');
  if (missing.length > 0) {
    console.warn('[design-tokens] Missing required CSS variables:', missing);
  }
  return missing;
}

/** Renders nothing; runs the contract check once after mount, development only. */
export function DevCssVarCheck() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    checkCssVariableContract();
  }, []);
  return null;
}
