# Technology Stack

**Analysis Date:** 2026-01-26

## Languages

**Primary:**
- TypeScript 5.8.3 - Full codebase (client and server)
- JSX/TSX - React component templates
- JavaScript - Configuration and tooling (next.config.js, etc.)

**Secondary:**
- CSS - Styling via Tailwind (see Frameworks)
- SVG - Image generation and placeholders
- SQL - Supabase PostgreSQL queries

## Runtime

**Environment:**
- Node.js (version not pinned, check package-lock.json)

**Package Manager:**
- npm (lockfile present: package-lock.json)

## Frameworks

**Core:**
- Next.js 16.1.3 - React framework with App Router
- React 19.2.3 - UI library
- React DOM 19.2.3 - DOM rendering

**State Management:**
- Zustand 5.0.5 - Client state management with persistence
- Immer 10.1.1 - Immutable state updates
- TanStack Query (React Query) 5.80.3 - Server state and data fetching
- TanStack Query DevTools 5.80.3 - Development debugging
- TanStack Virtual 3.13.12 - Virtualization for large lists

**UI & Styling:**
- Tailwind CSS 3.3.3 - Utility-first CSS
- Radix UI components - Accessible primitives:
  - react-aspect-ratio 1.1.8
  - react-collapsible 1.1.12
  - react-context-menu 2.2.16
  - react-hover-card 1.1.15
  - react-menubar 1.1.16
  - react-navigation-menu 1.2.14
  - react-separator 1.1.8
  - react-toast 1.2.15
- class-variance-authority 0.7.1 - Component variant management
- tailwind-merge 3.3.0 - Merge Tailwind classes
- tailwindcss-animate 1.0.7 - Animation utilities
- next-themes 0.4.6 - Dark mode theme switching
- Framer Motion 12.23.24 - Animations and transitions
- Embla Carousel React 8.6.0 - Carousel component
- Lucide React 0.554.0 - Icon library

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Core drag-drop library
- @dnd-kit/sortable 10.0.0 - Sortable list support
- @dnd-kit/modifiers 9.0.0 - Drag modifiers and constraints

**Forms & Validation:**
- React Hook Form 7.56.4 - Form state management
- @hookform/resolvers 3.9.0 - Form validation resolvers
- Zod 3.25.45 - TypeScript-first schema validation

**3D Graphics:**
- Three.js 0.182.0 - 3D rendering
- @react-three/fiber 9.4.2 - React renderer for Three.js
- @react-three/drei 10.7.7 - Useful Three.js helpers
- @react-spring/three 10.0.3 - 3D animations

**Visualization & Charts:**
- Recharts 2.15.3 - React charts library

**Utilities & Libraries:**
- Date FNS 4.1.0 - Date manipulation
- Fuse.js 7.1.0 - Fuzzy search
- HTML2Canvas 1.4.1 - Screenshot/canvas generation
- uuid 11.1.0 - UUID generation
- clsx 2.1.1 - Conditional CSS classes
- cmdk 1.1.1 - Command palette component
- React Day Picker 9.11.1 - Calendar component
- input-otp 1.4.2 - OTP input component
- react-resizable-panels 3.0.6 - Resizable layout panels
- Sonner 2.0.4 - Toast notifications
- Vaul 1.1.2 - Drawer component

**Command Palette & UI:**
- cmdk 1.1.1 - Command/search interface

## Key Dependencies

**Critical:**
- @clerk/nextjs 6.21.0 - Authentication (being migrated to Supabase)
- @supabase/supabase-js 2.76.1 - Supabase client for database/auth
- @supabase/ssr 0.7.0 - Supabase SSR utilities
- Svix 1.80.0 - Webhook handling (Clerk webhooks)

**AI & Image Generation:**
- @google/generative-ai 0.24.1 - Google Gemini API client
- Leonardo AI service (custom implementation in `src/lib/services/leonardo.ts`)
- Replicate support (for Stable Diffusion via API)
- OpenAI DALL-E 3 support (via API)

**Infrastructure:**
- Autoprefixer 10.4.21 - CSS vendor prefixing
- PostCSS 8.5.4 - CSS transformation
- @next/swc-wasm-nodejs 15.4.0 - Turbopack compiler optimization

**Image Optimization:**
- Images unoptimized (configured in `next.config.js` - disabled Next.js Image optimization)

## Configuration

**Environment:**
- Configuration via `.env.local` (see `.env.example`)
- Key environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase key
  - `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase key (never expose client-side)
  - `NEXT_PUBLIC_APP_URL` - Application base URL
  - `GEMINI_API_KEY` - Google Gemini API key
  - `LEONARDO_API_KEY` - Leonardo AI API key
  - `OPENAI_API_KEY` - OpenAI API key (for DALL-E)
  - `REPLICATE_API_TOKEN` - Replicate API token (for Stable Diffusion)
  - `CLERK_SECRET_KEY` - Clerk authentication secret (legacy, being removed)
  - `WEBHOOK_SECRET` - Clerk webhook secret
  - `NEXT_PUBLIC_ENABLE_SUPABASE` - Feature flag (enabled)
  - `NEXT_PUBLIC_ENABLE_LEGACY_API` - Feature flag (disabled)

**Build:**
- TypeScript strict mode enabled (`strict: true`)
- Path alias: `@/*` → `./src/*`
- Turbopack root configured
- Service Worker header configuration for PWA
- ESLint ignored during builds (`ignoreDuringBuilds: true`)
- JWST disabled (see `next.config.js`)

**TypeScript:**
- `tsconfig.json`:
  - Target: ES5
  - JSX mode: react-jsx
  - Module resolution: bundler
  - Strict mode enabled
  - Path aliases configured

## Platform Requirements

**Development:**
- Node.js (version not specified, latest recommended)
- npm for package management
- Modern browser (ES2020+ support)

**Production:**
- Node.js LTS or later
- Deployment target: Vercel (Next.js optimized) or compatible Node.js environment
- PostgreSQL database (via Supabase)
- Internet connectivity for external API integrations

**Browser Support:**
- ES5 compatible browsers minimum (transpilation via Next.js)
- Modern features for latest browsers (CSS Grid, Flexbox, CSS custom properties)

---

*Stack analysis: 2026-01-26*
