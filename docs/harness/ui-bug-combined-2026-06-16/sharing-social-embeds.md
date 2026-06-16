# Sharing & Social Embeds — Combined UI+Bug Scan
> Context: Share finished rankings via social deep links, embeddable widgets, oEmbed, and Open Graph cards.
> Files scanned: 19
> Total: 5 (Critical: 1, High: 2, Medium: 2, Low: 0)

## 1. OG image route `/api/og/[code]` does not exist — every social card 404s
- **Severity**: critical
- **Lens**: bug-hunter
- **Category**: broken feature / dead integration
- **File**: src/app/share/[code]/layout.tsx:68 (also src/app/api/share/route.ts:103, src/app/api/oembed/route.ts:122, src/lib/embed/EmbedCodeGenerator.ts:156, src/lib/og/OGCardGenerator.ts:264)
- **Scenario**: Share any ranking, then paste the `/share/[code]` link into Twitter/X, Facebook, Discord, Slack, or iMessage. The unfurler fetches `og:image` = `${baseUrl}/api/og/${code}?layout=...`. No route file exists anywhere under `src/app/api/og/` (confirmed by glob `src/app/api/og/**`), so the request returns 404 and the card renders with no image.
- **Root cause**: The metadata layer, share-create API, oEmbed thumbnail, and Markdown embed all hardcode `/api/og/{code}` URLs, but the actual image-generation endpoint was never wired up. The entire `OGCardGenerator` class plus `card-layouts/` (ListLayout/GridLayout/FeaturedLayout, `renderLayout`) are dead code with zero runtime consumers — they were built but never mounted behind a route.
- **Impact**: The headline value prop ("optimized Open Graph cards") is fully non-functional in production. Every shared link unfurls as a bare text card; oEmbed `thumbnail_url` and the GitHub Markdown badge are also broken images. Massive viral/growth loss.
- **Fix sketch**: Add `src/app/api/og/[code]/route.tsx` using Next's `ImageResponse` (`next/og`), reading the share row by code and calling `renderLayout(data, options, theme)` from `card-layouts`. Until then, fall back `og:image` to a static branded PNG so cards aren't broken.

## 2. Non-atomic read-modify-write on view/fork/challenge counters loses concurrent increments
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: race condition / data integrity
- **File**: src/app/api/share/[code]/route.ts:44 (and :100), src/app/api/share/route.ts:185, src/app/api/share/[code]/fork/route.ts:111
- **Scenario**: A popular ranking is opened by N viewers at once. Each request reads `data.view_count`, computes `view_count + 1` in JS, then writes it back. Two simultaneous requests both read e.g. 100 and both write 101, so one view is silently lost. Same pattern for `challenge_count` (route.ts:100) and `fork_count` (fork/route.ts:111).
- **Root cause**: Read-then-write increment performed client-side instead of an atomic DB operation. Under any real traffic the counters drift low.
- **Impact**: View/fork/challenge stats (prominently displayed via `AnimatedCounter` on the share page, lines 317–351) systematically under-count, undermining the social-proof feature. Worse the more "viral" a ranking gets.
- **Fix sketch**: Use an atomic increment — a Postgres RPC (`create function increment_view_count(...) ... set view_count = view_count + 1`) called via `supabase.rpc(...)`, or `UPDATE ... SET view_count = view_count + 1`. Remove the JS-side `+ 1`.

## 3. Share page bypasses the entire sharing engine — no UTM tracking, design-system drift, missing platforms
- **Severity**: high
- **Lens**: ui-perfectionist
- **Category**: architecture gap / design-system drift
- **File**: src/app/share/[code]/page.tsx:75-110 (platform list :22-29)
- **Scenario**: The primary public share surface (`/share/[code]`) hand-rolls its own `handleShare` switch with hardcoded `twitter.com/intent`, `facebook.com/sharer`, `wa.me`, etc. It does not use `getShareManager`, `ContentOptimizer`, or `DeepLinkGenerator` at all — unlike `QuickShareMenu.tsx`, which uses the real `ShareManager`. So the app has two divergent, independently-maintained share implementations.
- **Root cause**: The robust sharing library (`src/lib/sharing/*`) was built but the main share page never adopted it. UTM tagging (`ContentOptimizer.addUTMParams`) only runs through `ShareManager`, so links shared from the share page carry no `utm_source/medium/campaign` — share attribution analytics are blind on the highest-traffic path. Mobile users also miss the deep-link/intent handling in `DeepLinkGenerator`.
- **Impact**: No share attribution on the canonical surface; behavior diverges from QuickShareMenu; the page's `socialPlatforms` list omits Instagram, Telegram, and TikTok that the engine supports, so users see fewer options here than elsewhere. Maintenance hazard: platform fixes must be applied twice.
- **Fix sketch**: Replace the page's `handleShare`/`handleNativeShare`/`handleCopyLink` with `getShareManager().share({ platform, content })`, building `content` via `ContentOptimizer.buildRankingContent` so UTM + deep links are applied consistently and the platform list comes from one source of truth.

## 4. Unescaped OG `og:image` / `og:url` meta tags allow attribute-breakout injection
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: injection / output escaping
- **File**: src/lib/og/OGCardGenerator.ts:172-173 (also generateIframeEmbed src/lib/embed/EmbedCodeGenerator.ts:91-101)
- **Scenario**: `generateMetaTags` escapes `og:title`/`og:description` via `escapeHtml`, but emits `og:image` (`metadata.image`, line 172) and `og:url` (`metadata.url`, line 173) raw. Both derive from `baseUrl` + share code / image params. A crafted `shareCode`/option value containing `"` (e.g. `code="><meta http-equiv=refresh ...`) breaks out of the attribute when this string is injected into an HTML `<head>`. Same class of issue in `generateIframeEmbed`, where `url` (built from URL params incl. `listId`, `locale`, custom `colors`) is interpolated into `src="${url}"` with no escaping.
- **Root cause**: Inconsistent escaping policy — only some attributes are passed through `escapeHtml`; URL-typed fields are assumed safe but are attacker-influenceable via path/query params and are concatenated, not URL-encoded.
- **Impact**: If `generateMetaTags`/`generateIframeEmbed` output is ever rendered into a page (the embed code is displayed for copy-paste, and meta-tag helpers are intended for `<head>`), a malicious share/list id yields HTML/attribute injection on the embedding site. Stored-XSS-adjacent for third parties who paste embed codes.
- **Fix sketch**: Run all URL fields through `escapeHtml` (or better, validate/normalize via `new URL()` and `encodeURI`) before interpolation in both `generateMetaTags` and the iframe/script embed builders; never trust `shareCode`/`listId`/param values as pre-sanitized.

## 5. No loading or error feedback on the Fork action; copy/discord feedback is invisible mid-page
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: missing state / feedback polish
- **File**: src/app/share/[code]/page.tsx:100-104 (discord), :112-125 (copy), :421-439 (fork)
- **Scenario**: (a) The Discord button (`handleShare('discord')`, line 100) copies the link and sets `copied=true`, but the only "Copied!" affordance is on the separate Copy-Link button far down the page (line 396) — clicking Discord gives the user no visible confirmation near the button they pressed; they assume nothing happened. (b) `handleCopyLink` swallows clipboard failures (catch at line 122 only `console.error`s), so on a non-secure context / denied permission the user sees no "Copied!" and no error — silent failure. (c) The Fork button shows "Forking..." but the API can be slow and there is no skeleton/disabled styling difference beyond opacity; on success the user is navigated away by the hook, but on the `view_count` page there is no optimistic state.
- **Root cause**: Feedback is centralized on one button's `copied` flag and reused for semantically different actions (Discord share vs. copy link), and error branches have no UI path — only console logging.
- **Impact**: Users perceive Discord/copy sharing as broken when it actually succeeded (or failed silently), reducing share completion. Degrades the polish of the key conversion surface.
- **Fix sketch**: Give each share action its own transient toast/inline confirmation (reuse the existing `toast` util already imported by `use-fork-ranking`), and surface clipboard failures with an error toast plus a manual "select to copy" fallback. Co-locate the "Copied!" state with the button that triggered it.
