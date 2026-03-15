# External Integrations

**Analysis Date:** 2026-03-14

## APIs & External Services

**AI / Machine Learning:**
- Google Gemini (via `@google/genai` ^1.38.0) - AI item generation, image finding, YouTube lookup, item recommendations, structured output via JSON Schema
  - SDK: `@google/genai`, client wrapper at `src/lib/providers/gemini.ts` and `src/lib/api/studio-utils.ts`
  - Auth: `GEMINI_API_KEY` (server-only)
  - Used in: `src/app/api/studio/generate/route.ts`, `src/app/api/studio/find-image/route.ts`, `src/app/api/studio/find-youtube/route.ts`, `src/app/api/recommendation/route.ts`

- OpenAI - AI image generation (provider option in `src/app/api/generate-ai-image/route.ts`)
  - Auth: `OPENAI_API_KEY` (server-only)
  - Status: Supported provider alongside Replicate and mock mode

- Replicate - AI image generation (provider option)
  - Auth: `REPLICATE_API_TOKEN` (server-only)
  - Used in: `src/app/api/generate-ai-image/route.ts`

- Leonardo.ai - AI image generation (provider option)
  - Auth: `LEONARDO_API_KEY` (server-only)
  - Used in: `src/app/api/generate-ai-image/route.ts`

**Media & Content Data:**
- TMDB (The Movie Database) - Movie and TV show metadata, primary source for `movies` and `tv` categories
  - Base URL: `https://api.themoviedb.org/3`
  - Auth: `TMDB_API_KEY` (server-only)
  - Fetcher: `src/lib/enrichment/fetchers/TMDBFetcher.ts`

- IGDB (Internet Game Database) - Video game metadata, primary source for `games` category
  - Base URL: `https://api.igdb.com/v4`
  - Auth: Twitch OAuth (`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`); token fetched from `https://id.twitch.tv/oauth2/token`
  - Fetcher: `src/lib/enrichment/fetchers/IGDBFetcher.ts`

- Spotify Web API - Music metadata (albums, artists, tracks), primary source for `music` category
  - Base URL: `https://api.spotify.com/v1`
  - Auth: OAuth client credentials (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`); token from `https://accounts.spotify.com/api/token`
  - Fetcher: `src/lib/enrichment/fetchers/SpotifyFetcher.ts`

- Wikipedia / MediaWiki API - General information, fallback for all categories, primary for `sports` and `general`
  - Base URL: `https://en.wikipedia.org/w/api.php`
  - Auth: None (free public API)
  - Fetchers: `src/lib/enrichment/fetchers/WikipediaFetcher.ts`, `src/lib/api/wiki-images.ts`

- Open Library - Books metadata (primary source for `books` category)
  - Configured in enrichment routing: `src/lib/enrichment/SourceRouter.ts`
  - Auth: None (free public API)

- Google Books - Books metadata (fallback for `books` category)
  - Configured in enrichment routing: `src/lib/enrichment/SourceRouter.ts`

- MusicBrainz - Music metadata (fallback for `music` category)
  - Configured in enrichment routing: `src/lib/enrichment/SourceRouter.ts`

- YouTube - Music video lookup via Gemini Google Search integration
  - Used in: `src/app/api/studio/find-youtube/route.ts`, `src/lib/youtube.ts`
  - Auth: Indirectly via Gemini (no direct YouTube API key)

**Enrichment Pipeline:**
- Orchestrated by `src/lib/enrichment/EnrichmentPipeline.ts`
- Enabled/disabled via `ENABLE_ENRICHMENT_PIPELINE` env flag
- Sources routed by category in `src/lib/enrichment/SourceRouter.ts`

## Data Storage

**Databases:**
- Supabase (PostgreSQL) - Primary data store for all application data
  - Browser client: `src/lib/supabase/client.ts` (`createBrowserClient` from `@supabase/ssr`)
  - Server client: `src/lib/supabase/server.ts` (`createServerClient` from `@supabase/ssr`)
  - Connection (public): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Connection (server): `SUPABASE_SERVICE_ROLE_KEY` (never exposed client-side)
  - Types: `src/types/database.ts` (generated from Supabase schema)
  - Migrations: `supabase/migrations/`

**Client-Side Storage:**
- IndexedDB - Offline session persistence, sync queue, backlog cache
  - Managed by `src/lib/offline/OfflineStorage.ts`
  - Stores: `sessions`, `syncQueue`, `metadata`, `conflicts`, `backlogCache`
- localStorage - Zustand store persistence fallback; used by `persist` middleware in `src/stores/grid-store.ts` and `src/stores/session-store.ts`
  - Safe storage wrapper: `src/lib/storage/create-safe-storage.ts`

**File Storage:**
- No dedicated file storage detected; images are sourced from external URLs (Wikipedia, Amazon Media, Wikia, etc.)

**Caching:**
- In-memory API cache via `src/lib/cache/` unified cache layer
- TanStack Query cache for server state; config in `src/lib/cache/query-cache-config.ts`

## Authentication & Identity

**Auth Provider:**
- Clerk (`@clerk/nextjs` ^6.21.0) - Current production auth
  - Middleware: `middleware.ts` — protects `/match/*`, `/profile/*`, `/dashboard/*`
  - Provider: `ClerkProvider` wraps entire app in `src/app/layout.tsx`
  - User sync: Clerk → Supabase via webhook at `src/app/api/webhooks/clerk/route.ts`; syncs `user_profiles` table using `clerk_id` as foreign key
  - Webhook verification: `svix` library; secret in `WEBHOOK_SECRET`

**Planned Migration:**
- Clerk → Supabase Auth migration noted in `.env.example` and `CLAUDE.md`

## Monitoring & Observability

**Error Tracking:**
- Custom error tracking via `src/lib/errors/` — `trackError()` captures error code, category, severity, traceId, path, and method
- No third-party error monitoring service detected (no Sentry, Datadog, etc.)

**Logs:**
- `console.log` / `console.error` used throughout
- Custom logger at `src/lib/logger/` (directory present)

## CI/CD & Deployment

**Hosting:**
- Vercel implied (Next.js App Router, `maxDuration` exports on API routes, PWA service worker headers in `next.config.js`)

**CI Pipeline:**
- None detected in codebase (no `.github/workflows/`, no CI config files)

## Environment Configuration

**Required env vars:**
```
# Public (client + server)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL

# Server only
SUPABASE_SERVICE_ROLE_KEY
WEBHOOK_SECRET              # Clerk webhook verification (svix)
GEMINI_API_KEY              # Google Gemini AI

# Optional enrichment
TMDB_API_KEY
TWITCH_CLIENT_ID
TWITCH_CLIENT_SECRET
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
ENABLE_ENRICHMENT_PIPELINE  # Feature flag (boolean string)

# Optional AI image generation
OPENAI_API_KEY
REPLICATE_API_TOKEN
LEONARDO_API_KEY

# Clerk (injected by Clerk dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY   # Set by Clerk
CLERK_SECRET_KEY                    # Set by Clerk
```

**Secrets location:**
- `.env.local` (not committed); `.env.example` documents all vars

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhooks/clerk` — Receives Clerk user lifecycle events (`user.created`, `user.updated`, `user.deleted`); verifies signature with `svix`; syncs user profile to Supabase `user_profiles` table
  - Route: `src/app/api/webhooks/clerk/route.ts`

**Outgoing:**
- None detected

## Sharing & Embeds

**Open Graph Images:**
- Generated server-side at `src/lib/og/OGCardGenerator.ts`
- Cached by `src/lib/og/CacheManager.ts`
- Multiple layouts in `src/lib/og/card-layouts/`
- Served via `src/app/api/og/[listId]/route.ts`

**oEmbed:**
- `src/app/api/oembed/route.ts` — Standard oEmbed endpoint for embedding ranked lists

**Social Sharing Platforms:**
- `src/lib/sharing/platforms/` — Twitter, Facebook, Reddit, LinkedIn, Discord, Telegram, WhatsApp, Instagram, email, native share API, and clipboard copy

---

*Integration audit: 2026-03-14*
