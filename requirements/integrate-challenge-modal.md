# Integrate ChallengeModal into Landing Page

## Component Overview
**File:** `src/app/features/Landing/ChallengeModal.tsx`
**Exports:** ChallengeModal
**Purpose:** Modal for displaying challenge details, participants, top performers, and allowing users to start a challenge

## Why Integrate
The ChallengeModal provides a rich user experience for viewing challenge details before participating. It includes:
- Challenge metadata (title, description, status, dates)
- Participant count and top performers leaderboard
- Prize information display
- Start challenge action that navigates to match session

The modal complements the existing `challenge-store.ts` which already has state management for `isChallengeModalOpen`, `selectedChallenge`, and modal open/close actions. The only missing piece is rendering the modal in the UI.

## Integration Plan

### 1. Pre-Integration Updates
- [x] Component is production-ready with data-testid attributes
- [x] Uses existing hooks (`useChallengeEntries`, `useChallengeStore`, `useListStore`)
- [x] All dependencies are already installed (framer-motion, lucide-react, date-fns)
- [ ] No breaking changes required

### 2. Integration Points
**Primary Usage:**
- File: `src/app/features/Landing/LandingMain.tsx`
- Location: Add after existing modals (CompositionModal)
- Changes needed: Import and render ChallengeModal component

**Secondary Integration:**
The ChallengeModal depends on `ActiveChallenges` component to trigger it. These should be integrated together.

### 3. Implementation Steps

```tsx
// In LandingMain.tsx, add:
import { ChallengeModal } from './ChallengeModal';

// In the JSX return, add after CompositionModal:
<ChallengeModal />
```

### 4. Testing Requirements
- [ ] Modal opens when `openChallengeModal(challenge)` is called
- [ ] Modal displays challenge details correctly
- [ ] Top performers list renders with leaderboard entries
- [ ] Start Challenge button navigates to match page with correct params
- [ ] Modal closes on backdrop click and close button
- [ ] Disabled state works for ended/scheduled challenges

### 5. Cleanup Tasks
- [ ] Component is already in correct location
- [ ] No redundant code to remove

## Success Criteria
- ChallengeModal renders and opens via challenge store state
- Users can view challenge details and start participating
- Modal integrates with existing ActiveChallenges component flow
- All interactive elements have data-testid attributes (already present)

## Estimated Impact
- **Code Quality:** High - Completes the challenge feature flow
- **User Experience:** High - Enables challenge participation workflow
- **Maintainability:** High - Uses existing patterns and stores
- **Performance:** Neutral - Only renders when modal is open
