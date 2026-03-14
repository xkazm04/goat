# Phase 3: Content and AI Generation - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Populate video game categories with 100+ items each, complete the AI custom list pipeline in Studio so users can generate lists on any topic, and auto-hide underpopulated categories from the landing page. This phase makes the app substantively useful — real content to rank and a creation tool that works.

</domain>

<decisions>
## Implementation Decisions

### Category selection & seeding
- **Video games domain only** for launch — focus on depth over breadth
- 100+ items per category to ensure deep backlogs for Top 10/25/50 lists
- Gemini generates item title lists per category, IGDB enriches with metadata and cover art
- IGDB is primary image source, Wikipedia as fallback for older/niche titles
- Seed scripts should be idempotent — safe to re-run without duplicating data

### AI generation experience (Studio)
- Progressive reveal — items appear one-by-one as they're generated and enriched, like watching search results populate
- Users can edit item titles and remove items they don't want, but no per-item regeneration in v1
- Error handling: silent auto-retry once behind the scenes, then show error with suggestion to try a different/more specific topic after 2 failures
- Save flow is two-step: save as draft first, then explicit "Publish" to make the list rankable

### Empty category gating
- Threshold: 50+ items required to show a category on the landing page (update MIN_CATEGORY_ITEMS)
- Below threshold = completely hidden — no partial visibility, no capped list sizes
- Clean landing page — users only see categories with enough content for a full ranking experience

### Item quality & images
- Required fields: title + image. Description, year, genre are optional enrichment
- No-image fallback: styled placeholder card with game title overlaid (reuse existing placeholder-image component)
- Validate image URLs during seeding with HEAD requests — replace dead links with placeholder
- Items without images after all lookups still get included with the styled placeholder

### Claude's Discretion
- Specific video game sub-categories to create (e.g., "Best RPGs", "Best FPS Games", "Best Nintendo Games")
- Gemini prompt engineering for accurate game title generation
- IGDB API query strategy and rate limiting
- Exact progressive reveal animation timing
- Draft/publish UI component design
- Seed script execution order and error recovery

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/providers/gemini.ts`: Gemini client with GoogleGenAI, getItemRecommendation()
- `src/app/api/studio/generate/route.ts`: Full generate endpoint with Zod schema, enrichment pipeline, existing item dedup
- `src/lib/enrichment/`: EnrichmentPipeline with IGDBFetcher, WikipediaFetcher, TMDBFetcher, SpotifyFetcher
- `src/lib/api/studio-utils.ts`: Gemini client helper, error handling, wiki title extraction
- `src/types/studio.ts`: generateRequestSchema, geminiResponseSchema (Zod schemas)
- `src/stores/studio-store.ts`: Studio creation state management
- `src/components/ui/placeholder-image.tsx`: Existing placeholder image component
- `src/components/ui/progressive-image.tsx`: Progressive image loading

### Established Patterns
- API routes use `withErrorHandler` wrapper
- Zustand stores with `persist` middleware for state
- TanStack Query for data fetching with centralized query keys
- `src/lib/api/wiki-images.ts`: Wikipedia image fetching utility
- `pLimit` concurrency helper already in generate route

### Integration Points
- `src/app/api/top/groups/` and `top/items/`: Category and item API endpoints (data served here)
- `src/app/features/Landing/sub_LandingLists/`: Landing page list sections (category visibility)
- `src/app/features/Studio/`: Studio layout, form panel, items grid, sidebar
- `src/lib/config/category-config.ts`: Category configuration
- MIN_CATEGORY_ITEMS constant (from Phase 1): Category gating threshold

</code_context>

<specifics>
## Specific Ideas

- Video games only for now — get one domain right before expanding to movies, music, etc.
- Progressive item reveal should feel like watching a collection being built in real time
- The seed pipeline (Gemini → IGDB → validate) should be a reusable pattern for future category domains

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-content-and-ai-generation*
*Context gathered: 2026-03-15*
