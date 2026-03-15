# Technology Stack

**Analysis Date:** 2026-03-14

## Languages

**Primary:**
- TypeScript 5.8.3 - All application code in `src/`
- JavaScript - Config files (`next.config.js`, `postcss.config.js`)

**Secondary:**
- CSS - Global styles (`src/app/globals.css`), Tailwind utility usage

## Runtime

**Environment:**
- Node.js (version not pinned via `.nvmrc` or `.node-version`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js ^16.1.3 (App Router) - Full-stack React framework; pages in `src/app/`
- React ^19.2.3 - UI rendering
- React DOM ^19.2.3 - DOM bindings

**State Management:**
- Zustand ^5.0.5 - Multiple coordinated stores in `src/stores/`
- Immer ^10.1.1 - Immutable state updates, used within Zustand slices

**Data Fetching:**
- TanStack React Query ^5.80.3 - Server state and cache; query keys in `src/lib/query-keys/`
- TanStack React Virtual ^3.13.12 - Virtualised list rendering

**Drag & Drop:**
- @dnd-kit/core ^6.3.1 - Core DnD primitives
- @dnd-kit/sortable ^10.0.0 - Sortable presets
- @dnd-kit/modifiers ^9.0.0 - DnD behaviour modifiers

**UI Components:**
- Radix UI (multiple packages ^1.x–^2.x) - Accessible primitives:
  - `@radix-ui/react-aspect-ratio`, `react-collapsible`, `react-context-menu`,
    `react-hover-card`, `react-menubar`, `react-navigation-menu`,
    `react-separator`, `react-toast`
- Tailwind CSS 3.3.3 - Utility-first styling; config in `tailwind.config.ts`
- tailwind-merge ^3.3.0 - Class conflict resolution
- class-variance-authority ^0.7.1 - Variant-based component API
- tailwindcss-animate ^1.0.7 - CSS animation utilities
- @tailwindcss/container-queries ^0.1.1 - Container query breakpoints
- lucide-react ^0.554.0 - Icon library
- next-themes ^0.4.6 - Dark/light mode; default dark
- sonner ^2.0.4 - Toast notifications
- vaul ^1.1.2 - Drawer component
- cmdk ^1.1.1 - Command palette
- embla-carousel-react ^8.6.0 - Carousel
- input-otp ^1.4.2 - OTP input
- react-day-picker ^9.11.1 - Date picker
- recharts ^2.15.3 - Data charts

**Animation:**
- Framer Motion ^12.23.24 - Page transitions and component animations
- @react-spring/three ^10.0.3 - Spring physics for Three.js

**3D Rendering:**
- Three.js ^0.182.0 - 3D graphics
- @react-three/fiber ^9.4.2 - React renderer for Three.js
- @react-three/drei ^10.7.7 - Three.js helpers

**Testing:**
- Playwright ^1.57.0 (devDep) - E2E testing; config at `playwright.config.ts`
- Tests located in `e2e/`

**Component Development:**
- Storybook ^10.1.11 (devDep) - Component docs and isolation
  - Addons: a11y, docs, onboarding, webpack5 compiler
  - Config: `.storybook/` (implied)

**Build/Dev:**
- Next.js Turbopack - Dev bundler (configured in `next.config.js`)
- tsx ^4.20.6 (devDep) - TypeScript script execution
- ESLint 9.38.0 + eslint-config-next ^16.0.7 - Linting; builds ignore lint errors (`ignoreDuringBuilds` not set but ESLint disabled at build per CLAUDE.md)
- PostCSS 8.5.4 + autoprefixer 10.4.21 - CSS processing

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.76.1 - Primary database client (`src/lib/supabase/`)
- `@supabase/ssr` ^0.7.0 - SSR-aware Supabase client helpers
- `@clerk/nextjs` ^6.21.0 - Authentication provider; middleware at `middleware.ts`
- `svix` ^1.80.0 - Webhook verification for Clerk events (`src/app/api/webhooks/clerk/`)
- `zod` ^3.25.45 - Runtime schema validation throughout API routes
- `zod-to-json-schema` ^3.25.1 - Convert Zod schemas to JSON Schema for Gemini structured output
- `@google/genai` ^1.38.0 - Google Gemini AI SDK; used in studio, recommendation, and enrichment
- `html2canvas` ^1.4.1 - Client-side screenshot/image export for result sharing
- `fuse.js` ^7.1.0 - Fuzzy search for client-side filtering

**Infrastructure:**
- `uuid` ^11.1.0 - ID generation
- `date-fns` ^4.1.0 - Date formatting utilities
- `better-sqlite3` ^12.4.1 (devDep) - SQLite for local dev scripting

## Configuration

**Environment:**
- Variables loaded via `.env.local` (not committed)
- `.env.example` documents all required variables
- Key public vars prefixed `NEXT_PUBLIC_`; server-only vars have no prefix

**Build:**
- `next.config.js` - Next.js config; Turbopack root, image optimisation (WebP/AVIF), remote image patterns, PWA headers
- `tsconfig.json` - Strict mode, `@/*` → `./src/*` path alias, `bundler` module resolution
- `tailwind.config.ts` - Custom theme tokens, container query breakpoints, semantic z-index scale
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `components.json` - shadcn/ui component configuration

## Platform Requirements

**Development:**
- Node.js runtime
- npm for package management
- Supabase project (local or hosted)
- Clerk account for auth
- Optional: TMDB, IGDB/Twitch, Spotify, Gemini API keys for enrichment

**Production:**
- Next.js-compatible host (Vercel implied by App Router patterns)
- Supabase hosted project
- Service Worker (`public/sw.js`) for PWA offline support
- PWA manifest at `public/manifest.json`
- Image proxy for remote patterns: Wikimedia, Amazon Media, Wikia, Britannica, NHL, EliteProspects, WordPress-hosted images

---

*Stack analysis: 2026-03-14*
