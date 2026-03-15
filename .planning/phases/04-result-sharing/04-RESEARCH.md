# Phase 4: Result Sharing - Research

**Researched:** 2026-03-15
**Domain:** Client-side image capture, social sharing, OG metadata, mobile-responsive ranking UI
**Confidence:** HIGH

## Summary

Phase 4 has an unusually strong foundation of existing code. The share API (`/api/share`), OG image generation (`/api/og/[listId]`), share page (`/share/[code]`), ShareModal, ResultImageGenerator, ResultImageDownload, and social platform configurations all exist and are largely functional. The primary work is: (1) replacing "Coming Soon" stubs in CompletionModalActions with real share/download triggers, (2) swapping html2canvas for @zumer/snapdom for client-side capture, (3) streamlining the share flow per user decisions (stay on grid, highlight share button, two-step modal), (4) making the grid and share pages mobile-responsive with tap-to-place interaction, and (5) ensuring OG preview cards render correctly on Twitter, iMessage, Slack, etc.

The biggest risk is in mobile grid adaptation -- the current grid is desktop-oriented with drag-and-drop. Converting to tap-to-select + tap-to-place with a collapsible bottom panel requires meaningful UI work. The sharing infrastructure is 80%+ built and primarily needs wiring together.

**Primary recommendation:** Focus effort on mobile grid adaptation and the share flow UX (completion-to-share journey). The API/OG plumbing is already working -- wire it up, don't rebuild it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- On grid completion: **stay on grid, highlight share button** -- no modal interruption. Pulse/glow a share button in the header.
- Share modal flow is **two-step**: theme picker first, then rendered preview with download + share options
- Shareable link created **lazily on first share/download** -- no DB writes for rankings never shared
- Share modal includes **prominent copy link button at top** + social platform icons below
- Grid adapts with **compact cards, same grid layout** -- shrink card sizes, reduce padding, scroll-friendly. Title + thumbnail only on mobile.
- Item placement on mobile: **tap to select, tap slot to place** -- no dragging for adding items
- Backlog appears as **collapsible bottom panel** -- expandable to half-screen, grid visible above
- Reorder on mobile: **long-press to pick up, drag to swap** -- standard mobile pattern
- Share page shows **result image + "Challenge it" CTA**
- Attribution: **display name if logged in, "Someone" if guest**
- OG preview card: **top 3 items with cover images + list title** -- uses "featured" OG layout
- Challenge CTA: **same list but show preview first** with "Start Ranking" button

### Claude's Discretion
- Exact visual theme designs (2-3 themes for result images) -- use existing ImageStyle presets as starting point
- Image sizing strategy for Instagram vs Twitter
- Mobile breakpoint thresholds and exact card sizing
- Bottom panel animation and gesture handling implementation
- Share button glow/pulse animation design
- OG image caching strategy (CacheManager exists in lib/og/)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHAR-01 | User can download a PNG image of their completed ranking | @zumer/snapdom for client capture, existing ResultImageDownload modal for format options |
| SHAR-02 | Result image is sized correctly for social media (Instagram, Twitter/X) | Research confirms 1080x1080 (IG square), 1080x1350 (IG portrait), 1600x900 (Twitter); existing download modal has 1200x630 |
| SHAR-03 | User can get a unique shareable URL for their completed ranking | /api/share POST already creates share codes, ShareModal already calls it |
| SHAR-04 | Shared link shows OG preview image when pasted in social media/messaging | /api/og/[listId] already generates OG cards via Next.js ImageResponse, layout.tsx has full metadata |
| SHAR-05 | User can choose from 2-3 visual themes for their result image | ImageStyle presets exist (5 styles), narrow to 3 for v1; theme picker already in ResultImageGenerator |
| MOBL-01 | Ranking grid is usable on mobile devices | Tap-to-place interaction model, compact cards, bottom panel backlog |
| MOBL-02 | Result/sharing pages render correctly on mobile | Share page already has basic mobile layout, needs responsive polish |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @zumer/snapdom | latest | Client-side DOM-to-image capture | Zero deps, 148x faster than html2canvas, supports PNG/JPG/WebP/SVG |
| next/og (ImageResponse) | 16.x | Server-side OG image generation | Already in use at /api/og/[listId], edge runtime |
| framer-motion | 12.x | Animations (pulse, bottom panel, transitions) | Already used throughout codebase |
| @dnd-kit/core | 6.x | Drag-and-drop for mobile reorder | Already in use, supports touch sensors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| html2canvas | 1.4.1 | REMOVE - replaced by @zumer/snapdom | Currently used in ResultImageGenerator, should be swapped |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @zumer/snapdom | html2canvas (current) | html2canvas is ~400KB, slower, more rendering issues; snapdom is zero-dep, faster |
| @zumer/snapdom | dom-to-image-more | Older library, less maintained, snapdom is actively developed |
| Custom bottom panel | react-spring-bottom-sheet | Adding dependency for one component not justified; Framer Motion can handle it |

**Installation:**
```bash
npm install @zumer/snapdom
```

**Removal:**
```bash
# After migration, html2canvas can be removed
npm uninstall html2canvas
```

## Architecture Patterns

### Key Integration Points
```
src/
  components/app/modals/completion/
    CompletionModalActions.tsx       # Replace "Coming Soon" stubs with real buttons
  app/features/Match/
    ShareModal/ShareModal.tsx        # Wire to share API (already partially done)
    components/ResultImageGenerator.tsx  # Swap html2canvas -> @zumer/snapdom
    components/ResultImageDownload.tsx   # Already works, add sizing presets
    sub_MatchGrid/                   # Add mobile layout mode, tap-to-place
    sub_MatchCollections/            # Convert sidebar to bottom panel on mobile
  app/share/[code]/
    layout.tsx                       # OG metadata (already working)
    page.tsx                         # Enhance share page with challenge CTA
  app/api/
    share/route.ts                   # Already creates shared rankings
    og/[listId]/route.tsx            # Already generates OG images
```

### Pattern 1: Completion-to-Share Flow (New)
**What:** On completion, stay on grid, show pulsing share button in header. Tapping opens two-step share modal.
**When to use:** When grid is 100% filled.
**Implementation:**
```typescript
// In MatchGridHeader or equivalent:
const { isComplete } = useGridStore(state => state.getCompletionStatus());
const [showShareModal, setShowShareModal] = useState(false);

// Pulsing share button when complete
{isComplete && (
  <motion.button
    onClick={() => setShowShareModal(true)}
    animate={{
      boxShadow: ['0 0 0 0 rgba(6,182,212,0.4)', '0 0 0 12px rgba(6,182,212,0)', '0 0 0 0 rgba(6,182,212,0.4)']
    }}
    transition={{ duration: 2, repeat: Infinity }}
    className="px-4 py-2 bg-brand text-white rounded-lg font-semibold"
  >
    <Share2 className="w-4 h-4 mr-2" /> Share
  </motion.button>
)}
```

### Pattern 2: Two-Step Share Modal
**What:** Step 1: pick theme, generate preview. Step 2: download/share with link.
**When to use:** When user clicks share button.
**Implementation:** Merge existing ResultImageGenerator (theme picker + generation) with ShareModal (link + social). Single modal with two steps/tabs.

### Pattern 3: Mobile Tap-to-Place
**What:** Replace drag-to-add with tap-to-select + tap-slot-to-place on mobile.
**When to use:** On touch devices (detected via media query or touch event).
**Implementation:**
```typescript
// Track selected backlog item
const [selectedBacklogItem, setSelectedBacklogItem] = useState<string | null>(null);

// On backlog item tap: select it (highlight)
// On grid slot tap: if item selected, place it there
// On long-press grid item: activate drag mode for reorder
```

### Pattern 4: Collapsible Bottom Panel
**What:** On mobile, backlog appears as bottom sheet instead of sidebar.
**When to use:** Below `md` breakpoint (~768px).
**Implementation:** Use Framer Motion's `useDragControls` + `motion.div` with drag constraint to create bottom sheet. Three states: collapsed (peek bar), half-expanded, full-expanded.

### Anti-Patterns to Avoid
- **Don't rebuild the share API:** The `/api/share` route and `/api/og/[listId]` are already working. Wire into them, don't recreate.
- **Don't force drag-and-drop on mobile:** Touch drag is frustrating on small screens. Tap-to-place is the user-decided pattern.
- **Don't create share links eagerly:** User decision is lazy creation -- only hit `/api/share` when user actually shares.
- **Don't interrupt with completion modal:** User decision is to stay on grid and show pulsing share button. The existing CompletionModal can still exist but shouldn't auto-pop on share flow.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM-to-image capture | Canvas rendering pipeline | @zumer/snapdom | Handles edge cases (fonts, shadows, SVGs, cross-origin) that custom canvas code misses |
| OG image generation | Custom image generation | Next.js ImageResponse (already used) | Edge-optimized, JSX-based, handles font loading and caching |
| Social share URLs | Manual URL construction | Existing socialShareIntegration.ts functions | Already has platform-specific URL builders with encoding |
| Bottom sheet gesture | Custom touch handling from scratch | Framer Motion drag + constraints | Gesture recognition, spring physics, snap points built in |

## Common Pitfalls

### Pitfall 1: html2canvas Cross-Origin Image Issues
**What goes wrong:** html2canvas fails to render images from external domains (Supabase storage, Wikipedia, etc.) due to CORS.
**Why it happens:** Canvas taint restriction when drawing cross-origin images.
**How to avoid:** @zumer/snapdom handles this better, but still need `crossOrigin="anonymous"` on img elements. For the capture template, use a dedicated render div with proxy-loaded images.
**Warning signs:** Blank/broken images in captured output.

### Pitfall 2: OG Image Not Showing on Twitter/iMessage
**What goes wrong:** Social platform shows generic link instead of rich preview.
**Why it happens:** Missing/wrong og:image meta tags, image URL inaccessible from platform crawlers, image too large/small.
**How to avoid:** The existing layout.tsx already sets correct og:image tags. Ensure NEXT_PUBLIC_APP_URL is correct in production. Test with Twitter Card Validator, Facebook Sharing Debugger.
**Warning signs:** Preview works locally but not when deployed.

### Pitfall 3: Mobile Bottom Sheet Conflicts with Scroll
**What goes wrong:** Scrolling inside the bottom sheet also scrolls the page behind it, or vice versa.
**Why it happens:** Touch event propagation and body scroll lock issues.
**How to avoid:** Use `touch-action: none` on the sheet handle, `overflow: hidden` on body when sheet is expanded, and `overscroll-behavior: contain` on the sheet content.
**Warning signs:** Page jumps when interacting with bottom sheet.

### Pitfall 4: Tap-to-Place State Management
**What goes wrong:** Selected backlog item state gets stale or conflicts with drag state.
**Why it happens:** Two interaction modes (tap-to-place and long-press-to-drag) sharing state space.
**How to avoid:** Clear selection on any drag start. Use a separate `mobileSelection` state that coexists with dnd-kit's active state.
**Warning signs:** Ghost selections, items appearing in wrong slots.

### Pitfall 5: Image Sizing for Multiple Platforms
**What goes wrong:** Image looks good on Twitter but cropped on Instagram, or vice versa.
**Why it happens:** Different platforms have different aspect ratio requirements.
**How to avoid:** Generate at 1200x630 for OG/Twitter (1.91:1), offer 1080x1080 (square) and 1080x1350 (4:5) as download options. Existing ResultImageDownload already shows dimensions.
**Warning signs:** Important content cut off when shared.

## Code Examples

### @zumer/snapdom Basic Capture
```typescript
// Source: https://github.com/zumerlab/snapdom
import { snapdom } from '@zumer/snapdom';

// Capture a DOM element to PNG blob
const element = document.getElementById('result-preview');
const blob = await snapdom.toBlob(element, { type: 'image/png', scale: 2 });

// Or get as data URL
const dataUrl = await snapdom.toDataURL(element, { type: 'image/png', scale: 2 });

// Or get as canvas
const canvas = await snapdom.toCanvas(element);
```

### Replacing html2canvas in ResultImageGenerator
```typescript
// Before (current):
const html2canvasModule = await import('html2canvas');
const html2canvas = html2canvasModule.default;
const canvas = await html2canvas(canvasRef.current, {
  backgroundColor: null,
  scale: 2,
  logging: false,
});
const imageData = canvas.toDataURL('image/png');

// After (with @zumer/snapdom):
const { snapdom } = await import('@zumer/snapdom');
const imageData = await snapdom.toDataURL(canvasRef.current, {
  type: 'image/png',
  scale: 2,
});
```

### Social Media Image Size Presets
```typescript
export const IMAGE_SIZE_PRESETS = {
  twitter: { width: 1600, height: 900, label: 'Twitter/X (16:9)' },
  instagram_square: { width: 1080, height: 1080, label: 'Instagram Square (1:1)' },
  instagram_portrait: { width: 1080, height: 1350, label: 'Instagram Portrait (4:5)' },
  og_default: { width: 1200, height: 630, label: 'OG / Link Preview (1.91:1)' },
} as const;
```

### Framer Motion Bottom Sheet
```typescript
// Source: Framer Motion docs pattern
const sheetRef = useRef<HTMLDivElement>(null);
const COLLAPSED_HEIGHT = 80; // Peek bar
const HALF_HEIGHT = window.innerHeight * 0.5;

<motion.div
  ref={sheetRef}
  drag="y"
  dragConstraints={{ top: -(HALF_HEIGHT - COLLAPSED_HEIGHT), bottom: 0 }}
  dragElastic={0.1}
  onDragEnd={(_, info) => {
    // Snap to nearest position
    if (info.velocity.y > 500) collapse();
    else if (info.velocity.y < -500) expand();
    else info.offset.y < -(HALF_HEIGHT / 3) ? expand() : collapse();
  }}
  style={{ y: 0 }}
  className="fixed bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl"
>
  {/* Drag handle */}
  <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto my-3" />
  {/* Backlog content */}
</motion.div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2canvas for DOM capture | @zumer/snapdom | 2025 | Zero deps, 148x faster, better accuracy |
| Custom OG image generation | Next.js ImageResponse (edge) | Next.js 13+ | Built-in, edge-optimized, JSX-based |
| Drag-only mobile interaction | Tap-to-place + long-press-to-drag | Standard mobile pattern | Much better mobile UX |

**Deprecated/outdated:**
- html2canvas: Still works but @zumer/snapdom is superior (zero deps, faster, more accurate). Decision from Phase 1 STATE.md to use snapdom.

## Image Sizing Strategy (Claude's Discretion)

**Recommendation:** Generate at the highest useful resolution (2x scale via snapdom) then offer download presets:

| Preset | Dimensions | Use Case |
|--------|------------|----------|
| Twitter/X | 1600 x 900 | Twitter posts, link previews |
| Instagram Square | 1080 x 1080 | IG feed posts |
| Instagram Portrait | 1080 x 1350 | IG stories-adjacent, best engagement |

The capture template should be designed at 1200x630 (OG standard) and scaled/cropped for other formats. Use CSS aspect-ratio on the template div and let snapdom capture at 2x.

## Visual Theme Recommendation (Claude's Discretion)

Narrow from 5 existing ImageStyle presets to 3 for the share flow:

| Theme | Based On | Why Keep |
|-------|----------|----------|
| Modern | `modern` preset | Default, contemporary look, bold gradients |
| Minimalist | `minimalist` preset | Clean alternative, works universally |
| Retro | `retro` preset | Distinctive, fun personality |

Drop `detailed` (too similar to modern) and `abstract` (harder to read rankings in).

## Mobile Breakpoint Strategy (Claude's Discretion)

| Breakpoint | Layout |
|------------|--------|
| >= 1024px (lg) | Desktop: sidebar + full grid |
| 768-1023px (md) | Tablet: narrower sidebar or toggleable sidebar |
| < 768px (sm) | Mobile: bottom panel + compact grid, tap-to-place |

Compact card sizing on mobile: ~64px per card (thumbnail + title truncated), grid scrollable.

## Open Questions

1. **@zumer/snapdom API surface**
   - What we know: Supports toBlob, toDataURL, toCanvas, plugin system, scale option
   - What's unclear: Exact API for scale parameter and quality settings -- need to verify during implementation
   - Recommendation: Install and test with actual grid content during first task

2. **Share code uniqueness at scale**
   - What we know: Current generateShareCode() uses 8 random alphanumeric chars (62^8 = 218 trillion combinations)
   - What's unclear: No index on share_code column confirmed
   - Recommendation: Verify Supabase table has unique index on share_code; current retry logic (5 attempts) is fine

3. **User attribution on share page**
   - What we know: Decision is "display name if logged in, Someone if guest"
   - What's unclear: Whether shared_rankings table stores user display_name or just user_id
   - Recommendation: Store display_name at share creation time (denormalized) to avoid join on every view

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.57 |
| Config file | playwright.config.ts |
| Quick run command | `npx playwright test --grep "share" --project=chromium` |
| Full suite command | `npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHAR-01 | Download PNG of completed ranking | e2e | `npx playwright test tests/share-download.spec.ts -x` | No - Wave 0 |
| SHAR-02 | Image sized for social media | unit | Manual verification of size presets | No - Wave 0 |
| SHAR-03 | Get unique shareable URL | e2e | `npx playwright test tests/share-link.spec.ts -x` | No - Wave 0 |
| SHAR-04 | OG preview on social paste | manual-only | Twitter Card Validator, FB Debug Tool | N/A - external tools |
| SHAR-05 | Choose from 2-3 visual themes | e2e | `npx playwright test tests/share-themes.spec.ts -x` | No - Wave 0 |
| MOBL-01 | Grid usable on mobile | e2e | `npx playwright test tests/mobile-grid.spec.ts --project=Mobile\ Chrome -x` | No - Wave 0 |
| MOBL-02 | Share pages render on mobile | e2e | `npx playwright test tests/mobile-share.spec.ts --project=Mobile\ Chrome -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run build` (catches type errors and build issues)
- **Per wave merge:** `npx playwright test --project=chromium`
- **Phase gate:** Full Playwright suite green before verification

### Wave 0 Gaps
- [ ] `tests/share-download.spec.ts` -- covers SHAR-01, SHAR-02, SHAR-05
- [ ] `tests/share-link.spec.ts` -- covers SHAR-03
- [ ] `tests/mobile-grid.spec.ts` -- covers MOBL-01
- [ ] `tests/mobile-share.spec.ts` -- covers MOBL-02
- [ ] Playwright mobile device profile in playwright.config.ts (verify `Mobile Chrome` project exists)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: CompletionModalActions.tsx, ShareModal.tsx, ResultImageGenerator.tsx, /api/share/route.ts, /api/og/[listId]/route.tsx, /share/[code]/page.tsx
- [@zumer/snapdom npm](https://www.npmjs.com/package/@zumer/snapdom) - zero-dep DOM capture library
- [snapdom GitHub](https://github.com/zumerlab/snapdom) - API reference and usage

### Secondary (MEDIUM confidence)
- [Hootsuite Social Media Image Sizes 2026](https://blog.hootsuite.com/social-media-image-sizes-guide/) - Platform dimension requirements
- [Buffer Social Media Image Sizes 2026](https://buffer.com/resources/social-media-image-sizes/) - Cross-platform sizing guide

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing code is well-understood, @zumer/snapdom is verified real package
- Architecture: HIGH - most infrastructure already built, patterns are clear
- Pitfalls: HIGH - based on real codebase analysis and known html2canvas limitations
- Mobile patterns: MEDIUM - tap-to-place and bottom sheet are standard patterns but implementation details need validation during build

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable domain, no fast-moving dependencies)
