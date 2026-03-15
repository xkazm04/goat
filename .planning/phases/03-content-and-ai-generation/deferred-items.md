# Deferred Items - Phase 03

## Pre-existing Build Error

- **File:** `src/app/globals.css`
- **Error:** `@theme` blocks must only contain custom properties or `@keyframes` (CssSyntaxError from tailwindcss/postcss)
- **Impact:** `npx next build` fails. This error pre-dates Phase 03 changes.
- **Action needed:** Fix `globals.css` @theme block to comply with Tailwind v4 requirements, or fix `postcss.config.js` configuration.
