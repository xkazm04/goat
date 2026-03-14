# Technology Stack: Production Readiness

**Project:** G.O.A.T. (Greatest Of All Time)
**Researched:** 2026-03-14
**Scope:** What to ADD for production readiness (not re-documenting existing stack)

## Existing Stack (Not Changing)

Already established and not in scope for this research:

| Technology | Version | Role |
|------------|---------|------|
| Next.js | ^16.1.3 | Framework (App Router) |
| React | ^19.2.3 | UI |
| Supabase (data) | @supabase/supabase-js ^2.76.1 | Database + API |
| Zustand | ^5.0.5 | State management |
| TanStack Query | ^5.80.3 | Data fetching |
| @dnd-kit | ^6.3.1 / ^10.0.0 | Drag and drop |
| Tailwind CSS | ^4.2.1 | Styling |
| Framer Motion | ^12.23.24 | Animation |
| Radix UI | various | Accessible primitives |
| Zod | ^4.3.6 | Schema validation |

---

## New Stack for Production Readiness

### 1. Authentication: Supabase Auth (Clerk Removal)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| @supabase/ssr | ^0.7.0 | Server-side auth with cookie-based sessions | HIGH |

**Already installed.** The `@supabase/ssr` package is already in package.json. The migration is about removing `@clerk/nextjs` (^7.0.4) and `svix` (^1.80.0, used for Clerk webhooks) and rewiring auth to use Supabase Auth exclusively.

**Why Supabase Auth over keeping Clerk:**
- Consolidates under one vendor (Supabase handles DB + Auth + Storage)
- Eliminates Clerk's per-MAU pricing; Supabase free tier covers 50,000 MAU
- Cookie-based sessions integrate natively with Next.js App Router middleware
- Row Level Security policies work directly with Supabase Auth user IDs

**Key implementation details:**
- Create `createBrowserClient()` and `createServerClient()` utility functions
- Middleware must call `supabase.auth.getUser()` (not `getSession()`) for security -- getSession() trusts the JWT without server verification
- Auth token refresh happens in middleware, passed via cookies to Server Components
- OAuth providers (Google, GitHub) configured in Supabase dashboard, not in code

**Packages to REMOVE:**
- `@clerk/nextjs` -- replaced by @supabase/ssr
- `svix` -- Clerk webhook verification, no longer needed

**Sources:**
- [Supabase SSR Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) (HIGH confidence)
- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) (HIGH confidence)

---

### 2. AI Item Generation: Google Gemini SDK

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| @google/genai | ^1.38.0 (installed) | AI-powered item generation for lists | HIGH |

**Already installed.** The `@google/genai` package is the current official Google SDK (GA as of May 2025). It replaced the older `@google/generative-ai` package.

**Why this is the right choice:**
- GA status -- stable, fully supported for production
- Native Zod schema support for structured output (pairs perfectly with existing Zod ^4.3.6)
- Supports Gemini 2.0+ models with structured output, grounding, and function calling

**Implementation approach for item generation:**
- Use structured output with Zod schemas to get typed item data (name, description, image URL, metadata)
- Server-side only (API route) -- keep API key server-side
- Rate limit the generation endpoint to prevent abuse
- Cache generated items in Supabase to avoid regenerating

**No version change needed.** Current ^1.38.0 is fine; latest is 1.45.0 and the API is stable.

**Sources:**
- [@google/genai npm](https://www.npmjs.com/package/@google/genai) (HIGH confidence)
- [Gemini Structured Output docs](https://ai.google.dev/gemini-api/docs/structured-output) (HIGH confidence)

---

### 3. Image Generation for Sharing: @zumer/snapdom

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| @zumer/snapdom | ^2.0.1 | Generate shareable ranking result images | MEDIUM |

**Replace html2canvas** (^1.4.1, currently installed). html2canvas is effectively unmaintained and has known rendering issues with modern CSS.

**Why snapdom over alternatives:**
- 148x faster than html2canvas for large captures (benchmarked)
- Zero dependencies -- vanilla JS using standard browser APIs
- Accurate rendering of computed styles, pseudo-elements, custom fonts
- Multiple output formats: PNG, JPG, WebP, SVG, Canvas, Blob
- Actively maintained (v2.0.1 released January 2026)

**Why NOT html-to-image:**
- html-to-image (v1.11.13) hasn't been updated since 2024
- snapdom is newer but faster, more accurate, and actively maintained

**Why NOT server-side (Puppeteer/Playwright):**
- Client-side generation is faster (no round-trip to server)
- No server resource cost
- Works offline (important given existing PWA/offline support)

**Packages to REMOVE:**
- `html2canvas` -- replaced by @zumer/snapdom

**Fallback plan:** If snapdom has edge-case rendering issues, html-to-image (^1.11.13) is a proven fallback. Both are client-side DOM-to-image libraries with similar APIs.

**Sources:**
- [@zumer/snapdom npm](https://www.npmjs.com/package/@zumer/snapdom) (MEDIUM confidence -- newer library, less battle-tested)
- [snapdom GitHub](https://github.com/zumerlab/snapdom) (MEDIUM confidence)

---

### 4. Testing: Vitest + Playwright

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| vitest | ^4.1.0 | Unit and component testing | HIGH |
| @testing-library/react | ^16.x | Component test utilities | HIGH |
| @testing-library/jest-dom | ^6.x | DOM assertion matchers | HIGH |
| jsdom | ^26.x | DOM environment for Vitest | HIGH |
| @playwright/test | ^1.57.0 (installed) | End-to-end testing | HIGH |

**Playwright is already installed** but has no test files. Vitest is NOT installed yet.

**Why Vitest over Jest:**
- 10-20x faster in watch mode (ESBuild-based TypeScript handling)
- Native ESM support -- no transform configuration needed
- Next.js official docs include a Vitest setup guide
- Jest-compatible API (95% drop-in) so patterns are familiar
- Single config file (vitest.config.ts) -- simpler than Jest's transform pipeline

**Testing strategy (two layers):**
1. **Vitest + Testing Library** -- Unit tests for stores, utilities, hooks, and component rendering. Fast feedback loop during development.
2. **Playwright** -- E2E tests for critical user flows (ranking flow, auth flow, sharing). Run against production builds only.

**What NOT to use:**
- Jest -- slower, more configuration overhead, no advantage for this stack
- Cypress -- Playwright is faster, has better multi-browser support, already installed
- Storybook for testing -- already installed for component development, but don't conflate visual dev with automated testing

**Sources:**
- [Next.js Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest) (HIGH confidence)
- [Next.js Playwright guide](https://nextjs.org/docs/pages/guides/testing/playwright) (HIGH confidence)

---

### 5. Error Monitoring: Sentry

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| @sentry/nextjs | ^10.43.0 | Error tracking, performance monitoring, session replay | HIGH |

**Why Sentry:**
- Official Next.js SDK that instruments client, server, and edge in one package
- Auto-configuration wizard (`npx @sentry/wizard@latest -i nextjs`)
- Stack traces, breadcrumbs, session replays for debugging production issues
- Free tier (5K errors/month, 10K transactions) sufficient for launch
- Reworked for Turbopack compatibility in latest versions

**Configuration guidance:**
- Sample 100% of errors, 10% of performance traces in production
- Enable tunnel option to bypass ad-blockers dropping Sentry events
- Source maps uploaded during build for readable stack traces

**Sources:**
- [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/) (HIGH confidence)
- [@sentry/nextjs npm](https://www.npmjs.com/package/@sentry/nextjs) (HIGH confidence)

---

### 6. Analytics and Performance: Vercel

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| @vercel/analytics | ^2.0.1 | Page view and event tracking | HIGH |
| @vercel/speed-insights | ^2.0.0 | Core Web Vitals monitoring | HIGH |

**Why Vercel Analytics (not Google Analytics):**
- Zero-config integration with Next.js on Vercel
- Privacy-friendly (no cookies, GDPR-compliant by default)
- Core Web Vitals dashboard built into Vercel
- Free tier included with Vercel Hobby plan
- v2.0 adds resilient intake (dynamic endpoint discovery, bypasses blockers)

**Both packages are tiny** -- just wrapper components added to root layout. No configuration files needed when deployed on Vercel.

**Sources:**
- [@vercel/analytics npm](https://www.npmjs.com/package/@vercel/analytics) (HIGH confidence)
- [@vercel/speed-insights npm](https://www.npmjs.com/package/@vercel/speed-insights) (HIGH confidence)

---

### 7. Rate Limiting (API Protection)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| Supabase Edge Functions + pg rate limiter | N/A | Rate limit AI generation and public APIs | MEDIUM |

**No additional npm package needed.** Use Vercel's built-in rate limiting (available on Pro) or implement simple in-memory rate limiting with a Map + sliding window for the Hobby tier. For the AI generation endpoint specifically, enforce rate limits at the API route level.

**Why NOT upstash/ratelimit:**
- Adds another vendor (Upstash Redis) when you already have Supabase
- For launch scale, in-memory or Supabase-based limiting is sufficient
- Revisit if the app needs distributed rate limiting across multiple serverless instances

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Supabase Auth | Keep Clerk | Extra vendor, extra cost, project already decided to migrate |
| Auth | Supabase Auth | NextAuth.js (Auth.js) | Extra layer; Supabase Auth is native to the DB already in use |
| Image gen | @zumer/snapdom | html2canvas | Unmaintained, slower, known CSS rendering bugs |
| Image gen | @zumer/snapdom | html-to-image | Not updated since 2024, snapdom is faster |
| Image gen | Client-side | Server-side (Puppeteer) | Adds server cost, breaks offline support, slower |
| Unit test | Vitest | Jest | Slower, more config, no advantage for ESM/TS stack |
| E2E test | Playwright | Cypress | Playwright already installed, faster, better multi-browser |
| Monitoring | Sentry | LogRocket | Sentry has better Next.js integration, more mature |
| Analytics | Vercel Analytics | Google Analytics | Privacy concerns, cookie banners, more setup for same data |
| AI | @google/genai | OpenAI SDK | Already integrated, Gemini structured output + Zod is excellent |

---

## Complete Installation Commands

```bash
# New production dependencies
npm install @zumer/snapdom @vercel/analytics @vercel/speed-insights

# New dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/dom jsdom @vitejs/plugin-react

# Sentry (use wizard for auto-config)
npx @sentry/wizard@latest -i nextjs

# Remove deprecated packages
npm uninstall @clerk/nextjs svix html2canvas
```

---

## Package Summary: What Changes

### ADD
| Package | Version | Type | Purpose |
|---------|---------|------|---------|
| @zumer/snapdom | ^2.0.1 | prod | Shareable result image generation |
| @vercel/analytics | ^2.0.1 | prod | Page view and event tracking |
| @vercel/speed-insights | ^2.0.0 | prod | Core Web Vitals monitoring |
| @sentry/nextjs | ^10.43.0 | prod | Error tracking and performance |
| vitest | ^4.1.0 | dev | Unit/component testing |
| @testing-library/react | ^16.x | dev | Component test utilities |
| @testing-library/jest-dom | ^6.x | dev | DOM matchers |
| @testing-library/dom | ^10.x | dev | DOM testing utilities |
| jsdom | ^26.x | dev | Browser DOM environment |
| @vitejs/plugin-react | ^4.x | dev | React support in Vitest |

### REMOVE
| Package | Reason |
|---------|--------|
| @clerk/nextjs | Replaced by Supabase Auth (@supabase/ssr already installed) |
| svix | Clerk webhook verification, no longer needed |
| html2canvas | Replaced by @zumer/snapdom |

### KEEP (already installed, no changes)
| Package | Role in Production |
|---------|-------------------|
| @supabase/ssr ^0.7.0 | Auth middleware + SSR client |
| @google/genai ^1.38.0 | AI item generation |
| @playwright/test ^1.57.0 | E2E testing |
| zod ^4.3.6 | Validation + Gemini structured output schemas |

---

## Environment Variables for Production

```bash
# Supabase (existing, keep)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini (add)
GOOGLE_GENAI_API_KEY=

# Sentry (add)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=          # For source map uploads during build
SENTRY_ORG=
SENTRY_PROJECT=

# App (existing, keep)
NEXT_PUBLIC_APP_URL=

# REMOVE after Clerk migration
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# CLERK_SECRET_KEY
# CLERK_WEBHOOK_SECRET
```

---

## Sources

- [Supabase SSR Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase SSR Client Creation](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [@google/genai npm](https://www.npmjs.com/package/@google/genai)
- [Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [@zumer/snapdom GitHub](https://github.com/zumerlab/snapdom)
- [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest)
- [Next.js Playwright Guide](https://nextjs.org/docs/pages/guides/testing/playwright)
- [Sentry Next.js SDK](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [@vercel/analytics npm](https://www.npmjs.com/package/@vercel/analytics)
- [@vercel/speed-insights npm](https://www.npmjs.com/package/@vercel/speed-insights)
