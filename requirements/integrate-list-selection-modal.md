# Integrate ListSelectionModal for Quick List Switching

## Component Overview
**File:** `src/components/app/landing/ListSelectionModal.tsx`
**Exports:** ListSelectionModal
**Purpose:** Modal for browsing, searching, and selecting lists with filtering by category, showing both user-created and predefined/featured lists

## Why Integrate
The ListSelectionModal provides comprehensive list discovery:
- Search functionality across all lists
- Category filtering (Sports, Games, Music, etc.)
- Separated sections for "Your Lists" vs "Featured Lists"
- Quick navigation to match page with selected list
- Loading and empty states
- Integration with existing stores (useTopLists, useListStore, useTempUser)

### Current Gap
Users currently have limited ways to switch lists:
- Navigate back to landing page
- Find the specific list card
- Click to enter match

With ListSelectionModal:
- Quick switch from match page
- Search for any list
- Filter by category
- See all available lists in one view

## Integration Plan

### 1. Pre-Integration Updates
- [x] Component uses existing hooks and stores
- [x] Clean, styled UI with proper layouts
- [ ] Add data-testid attributes for testing
- [ ] Verify hook exports (useTopLists, useTempUser)

### 2. Integration Points

**Primary Usage - Match Page Header:**
Add list switcher to match interface:

```tsx
// In Match page or header component
import { ListSelectionModal } from '@/components/app/landing/ListSelectionModal';

const [showListModal, setShowListModal] = useState(false);

// In toolbar/header:
<button
  onClick={() => setShowListModal(true)}
  className="..."
  data-testid="switch-list-btn"
>
  <span>Switch List</span>
</button>

<ListSelectionModal
  isOpen={showListModal}
  onClose={() => setShowListModal(false)}
/>
```

**Alternative Usage - Landing Page:**
Could also add as quick access from landing page hero section.

### 3. Component Updates Needed

**Add data-testid attributes:**
```tsx
// In ListSelectionModal.tsx
<div data-testid="list-selection-modal">
  <input data-testid="list-search-input" ... />
  <select data-testid="category-filter" ... />
  <button data-testid="list-card-{list.id}" ... />
</div>
```

**Improve empty state:**
Consider adding "Create New List" button to empty state.

### 4. Testing Requirements
- [ ] Modal opens/closes correctly
- [ ] Search filters lists by title
- [ ] Category filter works
- [ ] User lists display with "Yours" badge
- [ ] Featured lists display separately
- [ ] Clicking list navigates to match page
- [ ] Loading state displays during fetch
- [ ] Empty state shows when no matches

### 5. Cleanup Tasks
- [ ] Move from `components/app/landing/` to feature-specific location
- [ ] Or keep in shared components if used in multiple places
- [ ] Update imports across codebase

## Use Cases

### Use Case 1: Quick List Switch
**User Story:** As a user in the middle of ranking, I want to quickly switch to a different list without leaving the match interface.

**Flow:**
1. User is on match page with Top 10 Movies
2. Clicks "Switch List" button
3. Modal opens with all available lists
4. Searches for "NBA"
5. Selects "Top 10 NBA Players"
6. Navigates to match page with new list

### Use Case 2: List Discovery
**User Story:** As a new user, I want to browse available lists before starting.

**Flow:**
1. User clicks "Browse Lists" on landing page
2. Modal opens with featured and user lists
3. Filters by "Games" category
4. Sees various game-related lists
5. Selects one to start ranking

## Success Criteria
- Modal accessible from match interface
- Search functionality works smoothly
- Category filter narrows results
- Lists are visually distinguished (owned vs featured)
- Selection navigates to correct match session
- Loading and empty states function properly

## Estimated Impact
- **Code Quality:** High - Uses existing patterns
- **User Experience:** High - Improves navigation flow
- **Maintainability:** High - Self-contained modal
- **Performance:** Good - Lazy loads list data

## Priority Assessment
**Priority: MEDIUM**

**Reasoning:**
- Useful quality-of-life improvement
- Not blocking core functionality
- Enhances user navigation
- Low effort to integrate

## Dependencies
- `useTopLists` hook - Must be working
- `useListStore.switchToList` - Must handle navigation
- `useTempUser` - For user-specific lists
