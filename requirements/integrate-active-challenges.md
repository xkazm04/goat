# Integrate ActiveChallenges into Landing Page

## Component Overview
**File:** `src/app/features/Landing/sub_Leaderboard/ActiveChallenges.tsx`
**Exports:** ActiveChallenges
**Purpose:** Displays a grid of currently active challenges with join buttons, entry counts, time remaining, and prize information

## Why Integrate
The ActiveChallenges component provides:
- Real-time list of live challenges using `useChallenges` hook
- Attractive card-based UI with shimmer effects and loading states
- Integration with `useChallengeStore.openChallengeModal()` for modal triggers
- Prize display and participation stats

This component works in tandem with ChallengeModal - ActiveChallenges displays the challenge cards, and clicking "Join Challenge" opens the ChallengeModal for more details.

## Integration Plan

### 1. Pre-Integration Updates
- [x] Component is production-ready with data-testid attributes
- [x] Uses existing hooks and stores (useChallenges, useChallengeStore)
- [x] All dependencies installed (framer-motion, lucide-react, date-fns)
- [ ] No breaking changes required

### 2. Integration Points
**Primary Usage:**
- File: `src/app/features/Landing/LandingLayout.tsx`
- Location: Add between LandingMain and FeaturedListsSection
- Changes needed: Import and render ActiveChallenges component

```tsx
// In LandingLayout.tsx:
import { ActiveChallenges } from './sub_Leaderboard/ActiveChallenges';

// In the JSX return:
<div className="min-h-screen">
    <LandingMain />
    <ActiveChallenges />  // Add here
    <FeaturedListsSection />
    <UserListsSection />
</div>
```

### 3. Testing Requirements
- [ ] Component fetches and displays active challenges
- [ ] Loading skeleton renders during data fetch
- [ ] "Join Challenge" button triggers `openChallengeModal`
- [ ] Cards display participant count, time remaining, and prizes
- [ ] Empty state (no challenges) renders null (hidden)

### 4. Cleanup Tasks
- [ ] Component is already in correct sub-folder structure
- [ ] No redundant code to remove

## Dependencies
This integration should be done WITH ChallengeModal integration, as they form a complete user flow:
1. User sees ActiveChallenges section on landing page
2. User clicks "Join Challenge" on a card
3. ChallengeModal opens with full details
4. User clicks "Start Challenge" to begin

## Success Criteria
- ActiveChallenges section appears on landing page
- Challenge cards render with correct data
- Join button opens ChallengeModal
- Loading and empty states work correctly

## Estimated Impact
- **Code Quality:** High - Completes challenges feature
- **User Experience:** High - Prominent challenge discovery
- **Maintainability:** High - Uses established patterns
- **Performance:** Neutral - Lazy loads challenge data
