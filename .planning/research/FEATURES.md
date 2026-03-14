# Feature Research

**Domain:** Interactive ranking/list-building web application (tier list maker)
**Researched:** 2026-03-14
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| End-to-end ranking flow | Core promise of the product. If users cannot pick a list, fill the grid, and see their result, nothing else matters. TierMaker, Topsters, and every competitor nail this. | HIGH | Partially built but broken -- items don't load correctly into the ranking grid. This is the single most critical fix. |
| Shareable result image | Every tier list maker exports to PNG/JPG. Users create rankings *to share them*. No sharing = no reason to complete the ranking. TierMaker, Topsters, Canva all do this. | MEDIUM | API route exists (`/api/og`, `/api/share`), Share feature folder exists. Needs to produce clean, branded images. |
| Shareable link (URL) | Users expect to send a link that shows their ranking. TierMaker generates unique URLs per completed list. Topsters creates public share pages. | MEDIUM | Enables viral growth loop: user shares link, recipient sees ranking, recipient wants to make their own. |
| No-account guest usage | TierMaker does not require login to create a tier list. Topsters has no login at all. Friction before value = abandonment. Users should rank first, sign up later. | LOW | Session persistence to localStorage/IndexedDB already exists. Gate sharing/saving behind auth, not creation. |
| Pre-populated item catalog | Users expect items to already exist when they pick a category. "Top 10 Movies" should show movies, not an empty grid. TierMaker has 1M+ templates. | HIGH | Database is partially populated. Some categories have items, others are empty. Needs systematic population strategy (AI + manual curation). |
| Drag-and-drop interaction | This is the core mechanic. Every competitor uses drag-and-drop. Users expect fluid, responsive dragging. | LOW | Already built with @dnd-kit. Exists and works. Polish for feel. |
| Mobile-responsive layout | Majority of social media traffic is mobile. If a user taps a shared link on their phone and the grid is unusable, you lose them. | MEDIUM | PWA exists but unclear if the grid interaction works well on touch devices. Drag-and-drop on mobile is notoriously tricky. |
| Save progress / resume later | TierMaker saves to browser storage. Users expect to close the tab and come back. Losing a half-complete ranking is rage-inducing. | LOW | Already implemented via Zustand persist middleware. Works for localStorage. Cloud sync for logged-in users is a bonus. |
| Search/browse available lists | Users need to discover what they can rank. TierMaker has category browsing and search. Landing page must surface available lists clearly. | LOW | Landing page and GlobalSearchBar exist. Needs to feel populated and discoverable. |
| User accounts with saved rankings | After guest trial, users want to save their work permanently, view history, and access across devices. TierMaker requires account for saving to profile. | MEDIUM | Clerk auth exists, migrating to Supabase Auth. Core flow: guest creates ranking, prompted to sign up to save permanently. |

### Differentiators (Competitive Advantage)

Features that set G.O.A.T. apart from TierMaker and other tier list makers.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-generated item lists | Users type any topic ("Top 10 Studio Ghibli films") and AI populates items with images. TierMaker requires manual template creation with uploaded images. This removes the biggest friction point in the creation flow. | MEDIUM | Google Gemini integration exists in Studio but isn't complete. This is the key differentiator -- zero-effort custom list creation. |
| Numbered ranked positions (not just tiers) | G.O.A.T. uses a numbered grid (1-50), not S/A/B/C tiers. This creates definitive rankings ("my #1 is X") rather than loose groupings. More opinionated, more shareable, more debatable. | LOW | Already the core design. This is a genuine differentiator. TierMaker groups items into tiers; G.O.A.T. forces precise ordering. |
| Comparison modal for hard decisions | When stuck between two items, users can directly compare them side-by-side. No competitor offers this as a built-in decision aid. | LOW | Already built (`comparison-store.ts`). Polish and make discoverable. |
| Beautiful, branded result images | TierMaker results look generic. If G.O.A.T. produces visually striking, social-media-optimized images (correct aspect ratios for Instagram/Twitter), users will prefer it for sharing. | MEDIUM | Result image generation exists as API route. Focus on visual quality: proper OG image dimensions, clean typography, brand watermark. |
| Custom list creation (any topic) | Combined with AI generation, users can rank literally anything. TierMaker requires someone to first create a template with uploaded images. G.O.A.T. can generate a rankable list from a text prompt. | MEDIUM | Studio feature exists. The UX needs to be: type topic, AI generates items, user starts ranking immediately. Minimal friction. |
| Progressive engagement (guest to user) | Most competitors are either fully anonymous (Topsters) or require login upfront (some mobile apps). G.O.A.T. can uniquely bridge: create freely as guest, prompt sign-up when sharing, sync guest rankings to account. | MEDIUM | Requires careful auth flow design. LocalStorage rankings need migration path to authenticated user's cloud storage. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time multiplayer ranking | "Rank together with friends!" sounds fun | Massive complexity (WebSocket infrastructure, conflict resolution, synchronized drag state across clients). Delays launch significantly for a feature most users won't use. | Async sharing: complete your ranking, share it, compare with friends' rankings side-by-side. |
| Social feed / following users | "See what your friends ranked" | Turns a creative tool into a social network. Requires moderation, feed algorithms, notification systems. Completely different product. | Profile pages with public rankings. Users share links directly. |
| Community voting / aggregated rankings | "What does everyone think is #1?" | Creates groupthink, discourages personal rankings, requires significant anti-gaming measures. Reddit already does community voting better. | Show "X people also ranked this" as social proof, but never aggregate into a "community ranking." |
| Infinite customization (colors, fonts, tier names) | Power users want control | Every customization option is UI complexity for everyone. TierMaker's customization is already messy. | Opinionated design with 2-3 theme options max. Beautiful by default beats customizable-but-ugly. |
| Comments / discussions on rankings | "Let people react to my ranking" | Requires moderation infrastructure, abuse handling, notification systems. Not the core product. | Share to external platforms (Twitter, Discord, Reddit) where discussion already happens. |
| Marketplace for premium templates | "Monetize user-created content" | Premature. No user base yet. Adds payment infrastructure complexity. Content quality control is a nightmare. | Free-for-all initially. Monetization is a v3+ concern after validating demand. |
| Offline-first with full sync | "Work completely offline" | Complex sync conflict resolution. PWA service worker already handles basic offline. Full offline-first is an engineering sinkhole. | Current approach is fine: persist to localStorage, sync when online. Don't over-engineer. |

## Feature Dependencies

```
[Pre-populated Item Catalog]
    └──requires──> [Database Population Strategy]
                       └──enhanced-by──> [AI Item Generation]

[Shareable Result Image]
    └──requires──> [End-to-End Ranking Flow]
    └──requires──> [Image Generation API]

[Shareable Link]
    └──requires──> [End-to-End Ranking Flow]
    └──requires──> [Persistent Storage for Rankings]

[User Accounts]
    └──requires──> [Supabase Auth Migration]
    └──enhances──> [Save Progress]
    └──enhances──> [Shareable Link] (user profile page)

[Custom List Creation]
    └──requires──> [AI Item Generation]
    └──requires──> [Studio UX Polish]

[Progressive Engagement]
    └──requires──> [Guest Usage (localStorage)]
    └──requires──> [User Accounts]
    └──requires──> [Guest-to-User Migration Logic]

[Beautiful Result Images]
    └──requires──> [Shareable Result Image]
    └──enhances──> [Shareable Link] (OG preview cards)

[Mobile-Responsive Layout]
    └──enhances──> [Shareable Link] (recipients often on mobile)
    └──conflicts──> [Complex Drag-and-Drop] (touch UX is harder)
```

### Dependency Notes

- **Shareable Result Image requires End-to-End Ranking Flow:** Cannot generate a result image if the ranking cannot be completed.
- **Custom List Creation requires AI Item Generation:** The entire value proposition of custom lists depends on AI being able to generate relevant items with images from a text prompt.
- **Progressive Engagement requires both Guest Usage and User Accounts:** The guest-to-user bridge is only valuable if both sides work independently first.
- **Mobile-Responsive conflicts with Complex Drag-and-Drop:** Touch-based drag-and-drop requires different interaction patterns (long-press to initiate, scroll vs drag ambiguity). May need simplified mobile interaction (tap-to-assign instead of drag).

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed for a stranger to use and share the product.

- [ ] **End-to-end ranking flow** -- The entire product is broken without this. Items load, user drags to grid, grid saves, ranking completes.
- [ ] **Pre-populated item catalog** -- At least 10-15 popular categories fully populated (movies, music, games, anime, sports, food). Empty categories should be hidden.
- [ ] **Shareable result image** -- PNG export of completed ranking. Clean, branded, sized for social media.
- [ ] **Shareable link** -- Unique URL showing a completed ranking with OG meta tags for link previews.
- [ ] **No-account guest usage** -- Zero friction to start ranking. No login wall.
- [ ] **Supabase Auth** -- Sign up to save rankings permanently. Google + email login.
- [ ] **Mobile-responsive grid** -- The grid and result page must be usable on mobile, even if creation is desktop-optimized.
- [ ] **Search/browse lists** -- Landing page that surfaces available categories.

### Add After Validation (v1.x)

Features to add once core flow is proven and users are completing rankings.

- [ ] **AI-generated custom lists** -- Type any topic, get a rankable list. Trigger: users are completing preset lists and asking for more categories.
- [ ] **Beautiful result images with themes** -- Multiple visual styles for result exports. Trigger: users are sharing results but engagement is low.
- [ ] **Comparison modal polish** -- Side-by-side item comparison during ranking. Trigger: users struggle with placement decisions (analytics show frequent repositioning).
- [ ] **User profile pages** -- Public page showing all of a user's completed rankings. Trigger: users complete multiple rankings.
- [ ] **Cloud sync across devices** -- Logged-in users get rankings synced. Trigger: users sign up and expect cross-device access.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Community template creation** -- Users create and share list templates. Defer: requires moderation, quality control.
- [ ] **Embed widget** -- Embed rankings on blogs/websites. Defer: niche use case, WidgetGenerator already partially built.
- [ ] **Challenges / time-limited rankings** -- "Rank your top 10 movies of 2026!" events. Defer: requires active community.
- [ ] **Achievement system** -- Badges for completing rankings. Defer: gamification is premature without retention data.
- [ ] **Consensus / group rankings** -- Compare your ranking with friends. Defer: interesting differentiator but complex.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| End-to-end ranking flow (fix broken items loading) | HIGH | HIGH | P1 |
| Pre-populated item catalog (10-15 categories) | HIGH | HIGH | P1 |
| Shareable result image (PNG export) | HIGH | MEDIUM | P1 |
| Shareable link with OG preview | HIGH | MEDIUM | P1 |
| No-account guest usage | HIGH | LOW | P1 |
| Supabase Auth migration | MEDIUM | MEDIUM | P1 |
| Mobile-responsive grid | HIGH | MEDIUM | P1 |
| Search/browse landing page | MEDIUM | LOW | P1 |
| AI-generated custom lists | HIGH | MEDIUM | P2 |
| Beautiful themed result images | MEDIUM | MEDIUM | P2 |
| Comparison modal polish | LOW | LOW | P2 |
| User profile pages | MEDIUM | MEDIUM | P2 |
| Cloud sync across devices | MEDIUM | MEDIUM | P2 |
| Community template creation | MEDIUM | HIGH | P3 |
| Embed widget | LOW | LOW | P3 |
| Challenges / events | MEDIUM | HIGH | P3 |
| Achievement system | LOW | MEDIUM | P3 |
| Consensus / group rankings | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | TierMaker | Topsters | Canva Tier Lists | G.O.A.T. Approach |
|---------|-----------|----------|------------------|-------------------|
| Ranking style | S/A/B/C/D tiers (grouping) | Grid collage (visual) | Tier template (design tool) | Numbered positions 1-N (definitive order) |
| Item source | User-uploaded template images | Album database search | Manual add | AI-generated from text prompt + curated catalog |
| Account required | No (to create), Yes (to save) | No | Yes (Canva account) | No (guest mode), Yes (to save/share) |
| Result sharing | Image download + social share buttons | Image download | Image/PDF download | Image + unique URL with OG preview |
| Custom creation | Upload images to make template | Search album database | Full design editor | Type a topic, AI generates items |
| Mobile experience | Web (responsive) | Web (basic) | App + Web | PWA (responsive) |
| Templates available | 1M+ user-created | Music-only | Generic tier template | AI-generated for any topic |
| Cost | Free (ads on free tier) | Free | Freemium | Free |

## Key Insight

The ranking/tier list space is dominated by TierMaker, which has massive template volume but mediocre UX and generic-looking results. The gap in the market is:

1. **AI-powered list creation** -- TierMaker requires manual template creation with uploaded images. G.O.A.T. can generate rankable lists from a text prompt, which is a fundamentally different (and better) creation flow.
2. **Definitive ordering** -- Tiers are vague ("A tier" vs "B tier"). Numbered rankings are more opinionated, more debatable, and more shareable ("My #1 is X, fight me").
3. **Visual quality** -- TierMaker results look like spreadsheets. Beautiful, social-optimized result images are an underserved niche.

The risk is trying to compete on template volume (TierMaker has 7+ years of user-generated content). Don't try. Compete on creation speed (AI), ranking precision (numbered positions), and visual quality (result images).

## Sources

- [TierMaker](https://tiermaker.com/) -- Market leader, 1M+ templates, tier-based grouping
- [Topsters](https://topsters.org/) -- Music-focused collage maker, grid-based
- [8 Best Tier List Maker Tools in 2026 - Simplified](https://simplified.com/blog/ai-design/tier-list-maker)
- [NightCafe AI Tier List Generator](https://creator.nightcafe.studio/tools/tier-list-generator)
- [Canva Tier List Maker](https://www.canva.com/create/tier-lists/)
- [Lomo AI Tier List Maker](https://lomolist.com/create-ai)
- [TierBuddy](https://tierbuddy.com/) -- Voted #1 by Reddit
- [Building FavMusic - Topster-style collage maker](https://medium.com/@fuhaiying007/building-favmusic-a-modern-shareable-topster-style-album-collage-maker-da3865727cb0)

---
*Feature research for: Interactive ranking/list-building web application*
*Researched: 2026-03-14*
