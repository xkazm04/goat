// dev-css-var-check.ts
// Dev-mode utility to warn if required CSS variables are missing on :root

const REQUIRED_CSS_VARS = [
  '--surface-card',
  '--surface-card-hover',
  '--surface-deep',
  '--surface-overlay',
  '--border-card',
  '--border-card-subtle',
  '--border-card-hover',
];

export function checkCssVariableContract() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;
  const root = document.documentElement;
  const missing = REQUIRED_CSS_VARS.filter(
    (v) => getComputedStyle(root).getPropertyValue(v).trim() === ''
  );
  if (missing.length > 0) {
    console.warn('[design-tokens] Missing required CSS variables:', missing);
  }
}

// Usage: import and call checkCssVariableContract() in your app entry (dev only)
