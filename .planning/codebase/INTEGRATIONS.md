# External Integrations

**Analysis Date:** 2026-01-26

## APIs & External Services

**Authentication & User Identity:**
- Clerk (legacy, being migrated to Supabase Auth)
  - SDK: @clerk/nextjs 6.21.0
  - Auth: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
  - Webhook integration at `src/app/api/webhooks/clerk/route.ts`
  - Webhook validation via Svix library
  - Syncs user profiles to Supabase PostgreSQL on user.created/updated/deleted events

**AI & Content Generation:**
- Google Gemini API
  - Client: @google/generative-ai 0.24.1
  - Implementation: `src/lib/providers/gemini.ts`
  - Auth: `GEMINI_API_KEY` (server-side only)
  - Used for: Item recommendations with Google Search integration
  - Model: gemini-flash-latest
  - Endpoints:
    - `/api/personalization/recommend` - Item recommendations
    - `/api/generate-ai-image` - AI-enhanced image composition

- Leonardo AI
  - Service: Custom `src/lib/services/leonardo.ts`
  - Auth: `LEONARDO_API_KEY`
  - Models: Phoenix 1.0, Phoenix 0.9, Flux Speed, Flux Dev, Flux 2
  - API versions: v1 and v2
  - Base URLs:
    - v1: https://cloud.leonardo.ai/api/rest/v1
    - v2: https://cloud.leonardo.ai/api/rest/v2
  - Features: Image generation with preset styles (Creative, Dynamic, Retro, Stock Photo, Cinematic, Sketch, Illustration)

- OpenAI DALL-E 3
  - Integration: `src/app/api/generate-ai-image/route.ts`
  - Auth: `OPENAI_API_KEY`
  - Endpoint: https://api.openai.com/v1/images/generations
  - Model: dall-e-3
  - Output size: 1792x1024

- Replicate (Stable Diffusion)
  - Integration: `src/app/api/generate-ai-image/route.ts`
  - Auth: `REPLICATE_API_TOKEN`
  - Endpoint: https://api.replicate.com/v1/predictions
  - Model: stability-ai/sdxl (Stable Diffusion XL)
  - Supports polling for async generation

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Server-side key: `SUPABASE_SERVICE_ROLE_KEY`
  - Client: @supabase/supabase-js 2.76.1
  - Client factory: `src/lib/supabase/client.ts` (browser client)
  - Server factory: `src/lib/supabase/server.ts` (server-side with cookie support)
  - Tables:
    - `user_profiles` - User account data (synced from Clerk)
      - Fields: clerk_id, display_name, email, avatar_url, is_premium, updated_at
  - Features:
    - Row Level Security (RLS) policies
    - Connection pooler recommended for serverless (port 6543)

**File Storage:**
- Supabase Storage buckets
  - `list-images` - Generated ranking images
  - `user-avatars` - User profile pictures
  - Bucket names: `NEXT_PUBLIC_STORAGE_BUCKET_IMAGES`, `NEXT_PUBLIC_STORAGE_BUCKET_AVATARS`

**Local Client Storage:**
- localStorage/IndexedDB via Zustand persistence
  - Grid state: `src/stores/grid-store.ts`
  - Session state: `src/stores/session-store.ts`
  - Backlog state: `src/stores/backlog-store.ts`

**Caching:**
- TanStack Query (React Query) with custom cache config
  - Configuration: `src/lib/cache/query-cache-config.ts`
  - API cache: `src/lib/cache/api-cache.ts`
  - DevTools: Available in development mode

## Authentication & Identity

**Auth Provider:**
- Clerk (legacy, being phased out)
  - Implementation: `src/app/layout.tsx` uses ClerkProvider
  - Hook: `src/hooks/use-clerk-user.ts`
  - Webhook endpoint: `/api/webhooks/clerk`
  - Webhook handler: Uses Svix for verification

- Supabase Auth (planned primary auth)
  - Client hooks: `src/hooks/supabase-auth/client.ts`
  - Server actions: `src/hooks/supabase-auth/actions.ts`
  - Main hook: `src/hooks/useSupabaseAuth.ts`
  - Supports OAuth via Supabase dashboard configuration:
    - Google OAuth
    - GitHub OAuth
    - Other providers

**Webhooks & Sync:**
- Clerk → Supabase sync via `/api/webhooks/clerk/route.ts`
  - Triggers:
    - user.created - Create user_profiles entry
    - user.updated - Update user_profiles
    - user.deleted - Delete user_profiles
  - Verification: Svix library with webhook secret
  - Fallback: Prevents retries for non-critical errors

## Monitoring & Observability

**Error Tracking:**
- Custom error handling system
  - Implementation: `src/lib/errors/GoatError.ts`
  - Error handler: `src/lib/errors/api-error-handler.ts`
  - Error analytics: `src/lib/errors/error-analytics.ts`
  - Error boundary: `src/lib/errors/ErrorBoundary.tsx`
  - Error toast UI: `src/lib/errors/ErrorNotificationToast.tsx`
  - Error categories: Network, validation, authentication, server, client
  - Severity levels: Critical, High, Medium, Low, Info

**Logs:**
- Console logging for development
  - API calls logged with 🌐 prefix
  - Drag events logged with 🔄 prefix
  - User sync logged with ✅ prefix
- React Query DevTools in development (`NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS`)

**Analytics (Planned):**
- Configurable via env vars (not yet implemented):
  - `NEXT_PUBLIC_GA_TRACKING_ID` - Google Analytics
  - `NEXT_PUBLIC_SENTRY_DSN` - Sentry error tracking

## CI/CD & Deployment

**Hosting:**
- Vercel (Next.js optimized)
- Alternative: Any Node.js-compatible environment

**CI Pipeline:**
- Not configured/detected in codebase
- ESLint available locally (`npm run lint`)

**Build Configuration:**
- Next.js Turbopack (configured in `next.config.js`)
- Build command: `npm run build`
- Dev command: `npm run dev`
- Start command: `npm start`

## PWA Configuration

**Service Worker:**
- Header configuration in `next.config.js`
- Static headers:
  - `/sw.js` - Service worker file with cache-control: max-age=0
  - `/manifest.json` - PWA manifest with cache-control: immutable (1 year)

**Offline Support:**
- OfflineProvider in `src/app/layout.tsx`
- Features: `showStatusIndicator`, `enableAutoSync`
- Implementation: `src/lib/offline/`

## Environment Configuration

**Required env vars:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Feature Flags
NEXT_PUBLIC_ENABLE_SUPABASE=true
NEXT_PUBLIC_ENABLE_LEGACY_API=false

# AI APIs (optional - graceful fallback if missing)
GEMINI_API_KEY=your-gemini-key
LEONARDO_API_KEY=your-leonardo-key
OPENAI_API_KEY=your-openai-key
REPLICATE_API_TOKEN=your-replicate-token

# Clerk (legacy, being removed)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
WEBHOOK_SECRET=your-webhook-secret

# File Storage
NEXT_PUBLIC_STORAGE_BUCKET_IMAGES=list-images
NEXT_PUBLIC_STORAGE_BUCKET_AVATARS=user-avatars
```

**Secrets location:**
- Local development: `.env.local` (git-ignored)
- Production: Platform secrets (Vercel Environment Variables, GitHub Secrets, etc.)
- Never commit actual secrets - use `.env.example` as template

**Security notes:**
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed client-side
- Use `NEXT_PUBLIC_` prefix only for safe, public values
- Rotate keys if accidentally exposed
- Enable Row Level Security (RLS) in Supabase

## Image & Asset Handling

**Remote Image Patterns:**
- Configured in `next.config.js`:
  - upload.wikimedia.org (Wikipedia Commons)
  - m.media-amazon.com (Amazon images)
  - static.wikia.nocookie.net (Wikia images)
- Recommendation: Add Leonardo/OpenAI image URLs if storing generated images

## Webhooks & Callbacks

**Incoming:**
- `/api/webhooks/clerk` - Clerk authentication events
  - Receives: user.created, user.updated, user.deleted, session.created
  - Validates: Svix HMAC signature verification
  - Actions: Syncs to user_profiles table in Supabase

**Outgoing:**
- Not configured (potential for future integrations)
- Candidates: Result image sharing, achievement webhooks

## Data Flow

**User Authentication Flow:**
1. User signs in via Clerk
2. Clerk webhook triggered → `/api/webhooks/clerk/route.ts`
3. User profile synced to `user_profiles` table in Supabase
4. Client accesses Supabase via public anon key with RLS
5. Server routes use service role key for privileged operations

**Image Generation Flow:**
1. User requests image generation via `/api/generate-ai-image`
2. Route dispatches to provider:
   - Replicate (Stable Diffusion) - async polling
   - OpenAI (DALL-E 3) - direct response
   - Leonardo - async polling with API v1 or v2
   - Mock - demo placeholders
3. Generated images returned to client
4. Images optionally stored in Supabase Storage

**List & Item Flow:**
1. Client queries `/api/lists`, `/api/top/groups` via TanStack Query
2. Server fetches from Supabase
3. Results cached locally by React Query
4. Zustand stores manage UI state (grid, session, backlog)
5. State persisted to localStorage

---

*Integration audit: 2026-01-26*
