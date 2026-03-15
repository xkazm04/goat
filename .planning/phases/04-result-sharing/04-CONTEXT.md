# Phase 4: Result Sharing - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can download a branded PNG of their completed ranking, choose from visual themes, copy a shareable link, and see an OG preview when that link is pasted in social media. The ranking grid and sharing pages render correctly on mobile. This phase closes the viral loop: rank → share → someone sees it → challenges it → ranks.

</domain>

<decisions>
## Implementation Decisions

### Share flow & completion UX
- On grid completion: **stay on grid, highlight share button** — don't interrupt the user with a modal. Pulse/glow a share button in the header.
- Share modal flow is **two-step**: theme picker first, then rendered preview with download + share options
- Shareable link created **lazily on first share/download** — no DB writes for rankings never shared
- Share modal includes **prominent copy link button at top** + social platform icons below (Twitter, Facebook, Reddit, WhatsApp, Discord already wired in ShareModal)

### Mobile grid & touch ranking
- Grid adapts with **compact cards, same grid layout** — shrink card sizes, reduce padding, scroll-friendly. Title + thumbnail only on mobile.
- Item placement: **tap to select, tap slot to place** — no dragging needed for adding items. Tap backlog item (highlighted), tap empty grid slot.
- Backlog appears as **collapsible bottom panel** — expandable to half-screen, grid visible above. Similar to mobile map bottom sheets.
- Reorder: **long-press to pick up, drag to swap** — standard mobile pattern (like iOS home screen). useTouchGestures hook already exists.

### OG preview & link experience
- Share page shows **result image + "Challenge it" CTA** — same visual style the sharer chose, with "Think you can do better? Make your own" button
- Attribution: **display name if logged in, "Someone" if guest** — "kazim's Top 10 RPGs" vs "Someone ranked their Top 10 RPGs"
- OG preview card: **top 3 items with cover images + list title** — uses existing "featured" OG layout. Visually rich, immediately readable.
- Challenge CTA: **same list but show preview first** — list details (category, item count) with "Start Ranking" button. One extra click but sets expectations.

### Claude's Discretion
- Exact visual theme designs (2-3 themes for result images) — use existing ImageStyle presets as starting point
- Image sizing strategy for Instagram vs Twitter (existing ResultImageGenerator has sizing logic)
- Mobile breakpoint thresholds and exact card sizing
- Bottom panel animation and gesture handling implementation
- Share button glow/pulse animation design
- OG image caching strategy (CacheManager exists in lib/og/)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/features/Match/ShareModal/ShareModal.tsx`: Social platform configs (Twitter, Facebook, Reddit, WhatsApp, Discord) with SVG icons
- `src/app/features/Match/components/ResultImageGenerator.tsx`: Template + AI generation modes, progressive steps, html2canvas dynamic import
- `src/app/features/Match/components/ResultImageDownload.tsx`: Download component
- `src/app/features/Match/lib/constants/image-styles.ts`: ImageStyle type and style presets
- `src/app/features/Match/lib/resultCache.ts`: Result image caching
- `src/app/features/Match/lib/socialShareIntegration.ts`: Share metadata generation, social platform helpers
- `src/lib/og/`: OGCardGenerator, CacheManager, Featured/Grid/List card layouts
- `src/app/share/[code]/layout.tsx`: Full OG metadata generation with dynamic image URLs, suggestLayout()
- `src/app/features/Match/hooks/useTouchGestures.ts`: Touch gesture handling for mobile
- `src/app/features/Match/sub_MatchGrid/lib/hapticFeedback.ts`: Haptic feedback utilities

### Established Patterns
- Completion modal stubs exist with "Coming Soon" for download/share (Phase 1 decision)
- `@zumer/snapdom` decided for client-side capture, `Next.js ImageResponse` for OG (Phase 1 STATE.md)
- ShareModal already wired with social platforms, just needs real image/link data
- `/api/share/route.ts` and `/api/share/[code]/route.ts` exist for creating/fetching shared rankings
- `/api/og/[listId]/route.tsx` exists for dynamic OG image generation

### Integration Points
- Completion modal in Match feature — replace "Coming Soon" stubs with real share button
- Grid store / session store — detect completion state to trigger share button highlight
- `shared_rankings` Supabase table — already has schema for storing shared ranking data
- `/share/[code]` page — already has layout with OG metadata, needs page content (currently minimal)
- Mobile responsive: grid-store grid rendering, CollectionPanel sidebar → bottom panel

</code_context>

<specifics>
## Specific Ideas

- The viral loop is the key outcome: rank → share → someone sees → challenges it → ranks
- Share page should feel like receiving a challenge, not just viewing a static result
- Mobile ranking should feel native — tap-to-place is more natural than fighting with drag on small screens
- Bottom panel for backlog should feel like Apple Maps / Google Maps bottom sheets

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-result-sharing*
*Context gathered: 2026-03-15*
