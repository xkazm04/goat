# AI Item Generation — Combined UI+Bug Scan
> Context: AI-assisted topic-to-items generation with image/YouTube matching and DB-backed save/reuse.
> Files scanned: 12
> Total: 5 (Critical: 0, High: 3, Medium: 2, Low: 0)

## 1. find-youtube trusts Gemini JSON without a schema and mis-recovers fenced output
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: malformed LLM JSON / trust-boundary
- **File**: src/app/api/studio/find-youtube/route.ts:78
- **Scenario**: Gemini is called with `responseMimeType: 'application/json'` but **no** `responseJsonSchema` (unlike generate/route.ts:312 which sets both). With the `googleSearch` tool enabled, Gemini frequently wraps JSON in markdown fences (```` ```json ... ``` ````) or prepends prose. `JSON.parse(responseText)` then throws and falls into the regex fallback (line 97), which only recovers a URL when the model emitted a literal `youtube.com/watch?v=` string. Any other valid-but-fenced response yields `parsedResponse = {}` → a false "no video found" even though the model returned a good URL.
- **Root cause**: Assumes `responseMimeType` alone guarantees clean JSON; it does not when a tool (Google Search) is attached, and there is no fence-stripping before parse.
- **Impact**: Intermittent "no YouTube video" results for songs that actually resolved, with no retry. Silently degrades the music-list authoring flow.
- **Fix sketch**: Strip ```` ``` ````/```` ```json ```` fences before `JSON.parse`, and pass a `responseJsonSchema` for `{youtube_url, video_title}` like the generate route does. Keep the regex as a last-resort fallback.

## 2. save-items silently discards items with non-conforming image/reference URLs
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: silent failure / data-loss
- **File**: src/app/api/studio/save-items/route.ts:20-21
- **Scenario**: `image_url`/`reference_url` use `z.string().url().optional()`. Generated items routinely carry image URLs sourced from Gemini "gemini_search" (find-image/route.ts:152) or from enrichment, which can include query strings, spaces, or be `null`. `z.string().url()` rejects malformed/`null` values, so `requestSchema.parse(body)` **throws for the whole batch** (handled as a 400 by `handleStudioError`), and the entire save is lost — not just the offending field. Because the schema validates the array as a unit, one bad URL among 100 items aborts persistence of all of them.
- **Root cause**: Strict per-field URL validation applied to AI-sourced data with no `.catch()`/sanitization, and no per-item partial-save path.
- **Impact**: Publishing a generated list can fail wholesale with a generic validation error if any single item has a non-URL image string; reuse cache never populates.
- **Fix sketch**: Make `image_url`/`reference_url` tolerant — e.g. `z.string().url().optional().catch(undefined)` (or `.or(z.literal(''))` → strip) so bad values are dropped per-field, and `.array().min(1)` still saves the good items.

## 3. PostgREST `ilike` OR filter does not escape `%`/`_` — wrong matches & reuse of unrelated items
- **Severity**: high
- **Lens**: bug-hunter
- **Category**: trust-boundary / data-integrity
- **File**: src/app/api/studio/generate/route.ts:107-113
- **Scenario**: `findExistingItems` (and the same pattern in match-items/route.ts:52-57) builds `name.ilike."${escaped}"` where `escaped` only escapes `\` and `"`. It does **not** escape SQL `LIKE` wildcards `%` and `_`. A generated title like `"50% Off"` or `"C_"` becomes an `ilike` pattern that matches many unrelated DB rows. The first such row's `id`/`image_url` is then adopted (generate/route.ts:132 / match-items:101), so the generated item is silently linked to and reuses the image of a completely different existing item. Note the codebase already has `escapeIlikeWildcards` (supabase/server.ts:30) used in the fuzzy branch (match-items:94) but NOT in the exact-match OR branch.
- **Root cause**: Inconsistent escaping — the exact-match OR path predates/forgot the `escapeIlikeWildcards` helper applied elsewhere.
- **Impact**: Wrong image/ID attached to generated items (visible data corruption in the card), and potential over-broad matches inflating `db_matched` counts.
- **Fix sketch**: Apply `escapeIlikeWildcards` to each title before interpolating into the `name.ilike."…"` OR condition in both generate and match-items routes.

## 4. CardPreviewPanel hardcodes "Example Item" + placeholder image — no generated-item preview
- **Severity**: medium
- **Lens**: ui-perfectionist
- **Category**: missing state / preview fidelity
- **File**: src/app/features/Studio/components/CardPreviewPanel.tsx:125-165
- **Scenario**: The preview always renders the `PLACEHOLDER_GRADIENT` background and the literal title "Example Item", regardless of what the AI generation produced. During/after generation there is no loading, empty, error, or streaming state in this card — it never reflects a real generated item's image (which may be `null` from enrichment) or title. Users configuring overlays cannot see how an actual generated card (including the common image-missing case, generate/route.ts:286) will look.
- **Root cause**: Component is a static mock decoupled from the generation result; props only carry `criteria`/`criteriaColors`, not a sample item or loading/error flag.
- **Impact**: Preview misrepresents the real output, especially the frequent "no image found" path; no feedback while generation streams.
- **Fix sketch**: Accept an optional `sampleItem` ({ title, image_url } ) plus a `state` prop ('idle'|'loading'|'error'); render the real title/image when available, a skeleton on loading, and an explicit broken-image fallback when `image_url` is null.

## 5. Streaming generate cannot recover after the first item is sent — partial result shows as success
- **Severity**: medium
- **Lens**: bug-hunter
- **Category**: partial results / error surfacing
- **File**: src/app/api/studio/generate/route.ts:577-646
- **Scenario**: In streaming mode, enrichment runs in sequential batches of 6. If any batch's `Promise.all` rejects after some items have already been streamed (e.g. a transient Wikipedia/enrichment-pipeline throw not caught inside `enrichItem`), control jumps to the outer `catch` (line 634) which emits a raw `{type:'error', message: err.message}` line — leaking internal error text and arriving *after* valid items, with no `{type:'done'}`. Conversely, if Gemini returns fewer items than `count`, the stream emits `done` with the short total and the UI has no signal that the request under-delivered.
- **Root cause**: No per-batch try/catch to continue streaming remaining items, and the terminal error line is unsanitized (unlike the Gemini-failure branch at line 542 which sanitizes). Count shortfall is never reported.
- **Impact**: Mid-stream failures surface internal messages to users and abort the rest of the list; under-delivery is silent. Inconsistent with the sanitized early-failure path.
- **Fix sketch**: Wrap each batch in try/catch so a failed item streams as `{type:'item', data:{…image_url:null}}` rather than aborting; sanitize the terminal `catch` message like line 545; and include `requested` vs `generated` in the `done` line so the client can warn on shortfall.
