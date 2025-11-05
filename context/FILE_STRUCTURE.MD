# GOAT Project - File Structure Documentation

## Overview
This document describes the file structure and architecture of the GOAT (Greatest of All Time) project, a Next.js application for creating and managing ranked lists with social sharing capabilities.

## Feature: Match Results Social Share Generation

### Overview
The social share generation feature enables users to create visually appealing images of their completed rankings and share them on social media platforms.

### New Files Created

#### API Endpoint
- **src/app/api/match/generate-result-image/route.ts** - POST endpoint for Gemini image generation

#### Components
- **src/app/features/Match/components/ResultImageGenerator.tsx** - Main modal for image generation with animated UI
- **src/app/features/Match/components/ResultImageDownload.tsx** - Download options component

#### Library Utilities
- **src/app/features/Match/lib/resultImagePrompt.ts** - Gemini prompt generation and style configurations
- **src/app/features/Match/lib/resultCache.ts** - IndexedDB caching system for generated images
- **src/app/features/Match/lib/socialShareIntegration.ts** - Social media sharing utilities

### Modified Files

#### Components
- **src/app/features/Match/MatchContainerHeader.tsx** - Added Share Results button with animated badge

#### State Management
- **src/stores/match-store.ts** - Added showResultShareModal state and actions

## Architecture

### Component Relationships

```
MatchContainerHeader
    ├── ProgressMain (progress indicator)
    ├── ComparisonModal trigger (Bench button)
    └── ResultImageGenerator (Share button)
            ├── ResultImageDownload
            ├── resultCache (caching)
            ├── resultImagePrompt (prompt generation)
            └── socialShareIntegration (sharing)
```

### State Management Flow

```
match-store (UI state)
    └── showResultShareModal

grid-store (data)
    └── gridItems → ResultImageGenerator

use-list-store (metadata)
    └── currentList → listMetadata → ResultImageGenerator
```

### Data Flow

1. User completes rankings and clicks Share button in MatchContainerHeader
2. MatchContainerHeader opens ResultImageGenerator modal
3. Component checks IndexedDB cache for existing image
4. If not cached:
   - User selects style (minimalist, detailed, abstract, retro, modern)
   - Clicks Generate Image
   - Preview is rendered with html2canvas
   - Image saved to IndexedDB cache
5. Generated image displayed with share/download options
6. User can:
   - Share to social platforms (Twitter, Facebook, LinkedIn, Reddit, WhatsApp)
   - Download with custom format and quality options
   - Regenerate with different style (Remix button)

## UI/UX Innovation

### Animated Image Generation
- Particle effect flows from grid items to central canvas during generation
- Smooth scale-in animation for image reveal
- Live preview with style-based gradients
- Loading states with visual feedback

### Style Variations
- **Minimalist:** Clean, simple design with white space
- **Detailed:** Rich visuals with ornate elements
- **Abstract:** Geometric shapes and bold gradients
- **Retro:** Vintage-inspired with nostalgic aesthetics
- **Modern:** Contemporary design with vibrant gradients

### Social Integration
- Platform-specific share URLs with pre-filled text
- Native mobile share support (Web Share API)
- Clipboard copying for manual sharing
- Image download with format selection (PNG, JPG, WebP)

## New Patterns & Architectural Decisions

### 1. Client-Side Image Generation
**Decision:** Use html2canvas instead of server-side generation
**Rationale:**
- Reduced server load
- Faster generation time
- No API rate limits for image generation
- User can regenerate unlimited times

### 2. IndexedDB Caching
**Decision:** Cache generated images in browser
**Rationale:**
- Instant retrieval for identical grid states
- Reduces redundant generation
- Persists across sessions
- No server storage costs

### 3. Modular Share System
**Decision:** Separate utilities for different platforms
**Rationale:**
- Easy to add new platforms
- Testable in isolation
- Platform-specific optimizations
- Fallback to Web Share API

### 4. Style-Based Rendering
**Decision:** Pre-defined style configurations
**Rationale:**
- Consistent visual quality
- Faster generation (no style decision needed)
- Easy to extend with new styles
- User-friendly selection interface

### 5. Progressive Enhancement
**Decision:** Core functionality works without Gemini API
**Rationale:**
- No hard dependency on external service
- Graceful degradation
- Cost optimization
- Reliability

## Performance Optimizations

1. **Caching Strategy**
   - Images cached in IndexedDB with hash-based keys
   - Automatic cleanup of old images (configurable max age)
   - Cache size monitoring

2. **Lazy Loading**
   - Modal components loaded on-demand
   - Image generation only when requested

3. **Client-Side Rendering**
   - html2canvas for efficient image generation
   - No server-side processing overhead

## Dependencies

- **html2canvas** - Client-side image generation
- **framer-motion** - Animations and transitions
- **lucide-react** - Icons
- **IndexedDB** - Browser-based caching
- **Gemini API** - (Optional) AI-powered image descriptions

## Next Steps

### Recommended: Goal 4 - Public Results Gallery

After implementing social sharing, create a **Public Results Gallery** feature:

1. **Display Shared Results from Other Users**
   - Public gallery page with recent shared rankings
   - Infinite scroll or pagination
   - Filtering by category, time period, popularity

2. **Engagement Metrics**
   - View counts for each shared result
   - Like/favorite functionality
   - Trending rankings

3. **Supabase Integration**
   - Store shared result metadata in Supabase
   - Upload generated images to Supabase Storage
   - User authentication for ownership
   - Public/private visibility options

4. **Social Features**
   - User profiles with shared rankings
   - Follow system
   - Comments on shared rankings
   - Remix/fork functionality

5. **Discovery & Exploration**
   - Curated collections
   - Search functionality
   - Category-based browsing
   - Related rankings feature

This would create a community aspect, encouraging users to share and engage with content, building directly on the social sharing infrastructure.

### Alternative Next Steps

**Option B: Enhanced Ranking Process**
- AI-powered item suggestions
- Import from external sources (Spotify, IMDb)
- Collaborative ranking
- Historical ranking comparison

**Option C: Advanced Analytics**
- Personal ranking statistics dashboard
- Community comparison
- Ranking trends over time
- Preference insights

---

## Feature: Match Grid Modular Refactor

### Overview
Refactored the Match Grid system from ~20 monolithic files into a modular feature architecture with clear separation of concerns. This improves maintainability, reduces coupling, and enables parallel development.

### New Directory Structure

```
Match/
├── MatchPodium/           # Top 3 podium presentation
│   ├── index.tsx
│   └── MatchGridPodium.tsx
├── MatchControls/         # Grid item controls & interactions
│   ├── index.tsx
│   ├── MatchGridSlot.tsx
│   ├── MatchEmptySlot.tsx
│   ├── MatchGridItem.tsx
│   ├── MatchGridItemEmpty.tsx
│   └── MatchGridItemControls.tsx
├── MatchGrid/            # Grid domain logic
│   └── lib/
│       ├── index.ts
│       ├── dragHandlers.ts      # DnD event handlers
│       ├── gridCalculations.ts  # Position calculations
│       └── sizeMapping.ts       # Size configurations
├── MatchState/           # Centralized state management
│   ├── index.ts
│   └── useMatchGridState.ts
└── components/           # Supporting components
    ├── FeatureModuleIndicator.tsx  # NEW: Real-time component hierarchy
    ├── ResultImageGenerator.tsx
    └── ResultImageDownload.tsx
```

### New Files Created

#### State Management
- **src/app/features/Match/MatchState/useMatchGridState.ts** - Aggregated state hooks with memoization
- **src/app/features/Match/MatchState/index.ts** - Public exports

#### Utilities
- **src/app/features/Match/MatchGrid/lib/dragHandlers.ts** - DnD event handler factories
- **src/app/features/Match/MatchGrid/lib/gridCalculations.ts** - Grid position & statistics
- **src/app/features/Match/MatchGrid/lib/sizeMapping.ts** - Size configurations
- **src/app/features/Match/MatchGrid/lib/index.ts** - Utility exports

#### Components
- **src/app/features/Match/components/FeatureModuleIndicator.tsx** - Animated component tree visualization

#### Index Files (Feature Exports)
- **src/app/features/Match/MatchPodium/index.tsx**
- **src/app/features/Match/MatchControls/index.tsx**

#### Documentation
- **src/app/features/Match/README.md** - Comprehensive architecture documentation

### Modified Files

#### Container Components
- **src/app/features/Match/MatchContainer.tsx** - Now uses centralized hooks and utilities
  - Imports from `MatchState`, `MatchGrid/lib`
  - Reduced from ~230 lines to ~200 lines
  - Added `FeatureModuleIndicator` component
- **src/app/features/Match/MatchGrid.tsx** - Updated imports to use new structure

#### Moved Components
- **MatchGridPodium.tsx** → `MatchPodium/MatchGridPodium.tsx`
- **MatchGridItemEmpty.tsx** → `MatchControls/MatchGridItemEmpty.tsx`
- **MatchGridItemControls.tsx** → `MatchControls/MatchGridItemControls.tsx`
- **MatchGridSlot.tsx** → `MatchControls/MatchGridSlot.tsx` (from components/app/match)
- **MatchEmptySlot.tsx** → `MatchControls/MatchEmptySlot.tsx` (from components/app/match)
- **MatchGridItem.tsx** → `MatchControls/MatchGridItem.tsx` (from components/app/match)

#### Updated Imports
- **src/app/features/Match/MatchPodium/MatchGridPodium.tsx** - Uses `MatchGridSlot` from `../MatchControls`
- **src/app/features/Match/MatchControls/MatchGridSlot.tsx** - Internal imports from same directory
- **src/components/app/match/MatchPodiumItem.tsx** - Updated to import from new location

### Architecture Changes

#### Component Relationships (Updated)

```
MatchContainer (DnD Context)
  ├── FeatureModuleIndicator (NEW - shows active modules)
  ├── MatchState (NEW - centralized state)
  │   ├── useMatchGridState
  │   ├── useMatchGridActions
  │   └── useMatchGridSelectors
  ├── MatchGrid/lib (NEW - domain utilities)
  │   ├── dragHandlers
  │   ├── gridCalculations
  │   └── sizeMapping
  └── MatchContainerContent
      ├── MatchGrid
      │   └── MatchPodium
      │       └── MatchGridPodium
      │           └── MatchGridSlot (x N positions)
      │               ├── MatchEmptySlot (if empty)
      │               └── MatchGridItem (if filled)
      │                   └── MatchGridItemControls
      └── BacklogGroups
```

#### State Management Flow (New)

```
Before Refactor:
Component → useItemStore + useMatchStore + useListStore + useBacklogStore
  ↓ (4 separate subscriptions)
Multiple re-renders

After Refactor:
Component → useMatchGridState
  ↓ (1 aggregated hook with memoization)
Optimized re-renders + derived state cached
```

#### Import Pattern (New)

```typescript
// Old Pattern
import MatchGridPodium from './MatchGridPodium';
import { useItemStore } from '@/stores/item-store';
import { useMatchStore } from '@/stores/match-store';
import { useListStore } from '@/stores/use-list-store';

// New Pattern
import { MatchGridPodium } from './MatchPodium';
import { useMatchGridState } from './MatchState';
import { createDragStartHandler, getSizeClasses } from './MatchGrid/lib';
```

### New Patterns & Architectural Decisions

#### 1. Feature Subdirectories Pattern
**Decision:** Organize components into feature-based subdirectories
**Rationale:**
- Clear separation of concerns by domain
- Easier to locate related components
- Enables parallel development
- Better code splitting opportunities

#### 2. Centralized State Management Hook
**Decision:** Create `useMatchGridState` aggregating all store subscriptions
**Rationale:**
- Reduces boilerplate in components
- Memoizes derived state (grid statistics, drag state flags)
- Single subscription point reduces re-renders
- Provides specialized hooks (actions-only, selectors-only)

#### 3. Utility Library Pattern
**Decision:** Extract domain logic to `MatchGrid/lib/`
**Rationale:**
- Testable in isolation
- Reusable across components
- Separates business logic from presentation
- Improves code organization

#### 4. Index File Exports
**Decision:** Use index.tsx files for public API
**Rationale:**
- Clean import statements
- Encapsulation of internal structure
- Easy to refactor internals without breaking imports
- Standard module pattern

#### 5. Real-time Component Visualization
**Decision:** Add `FeatureModuleIndicator` showing active components
**Rationale:**
- Helps developers understand runtime behavior
- Visual debugging tool
- Educational for new contributors
- Demonstrates feature module boundaries

### UI/UX Innovation

#### Feature Module Structure Indicator
A collapsible tree diagram in the top-right corner that displays:
- **Active Modules**: Highlighted in blue when in use
- **Component Hierarchy**: Shows parent-child relationships
- **Real-time Updates**: Updates during drag operations showing which modules are active
- **Developer Tool**: Helps understand which components handle current operations

**States Tracked**:
- MatchContainer (always active)
- MatchState (active during drag)
- MatchGrid/MatchPodium/MatchControls (active when rendering grid)
- dragHandlers (active during drag operations)
- gridCalculations (active during positioning logic)
- sizeMapping (active when rendering sized items)

### Performance Optimizations

1. **Reduced Bundle Size**:
   - Components now code-split by feature directory
   - Lazy loading opportunities increased
   - Tree-shaking more effective with explicit exports

2. **Optimized Re-renders**:
   - `useMatchGridState` memoizes derived state
   - Components subscribe only to needed slices
   - Drag handlers memoized with `useMemo`

3. **Improved Code Splitting**:
   - Feature directories enable better chunk splitting
   - Related components bundled together
   - Reduced main bundle size

### Testing Strategy

#### Unit Tests (New)
- `dragHandlers.ts`: Test event handler creation
- `gridCalculations.ts`: Test position logic
- `sizeMapping.ts`: Test size configuration functions
- `useMatchGridState.ts`: Test state aggregation

#### Integration Tests
- Module interaction during drag operations
- State updates across feature boundaries
- Import/export correctness

### Migration Notes

All existing functionality preserved. No breaking changes to user-facing behavior. Internal refactor only.

**Import Updates Required**:
- Components importing `MatchGridPodium` must update to new path
- Components importing `MatchGridSlot` must update to new path
- Any direct imports from `components/app/match` need updating

### Related Documentation

- [Match Feature Architecture](../src/app/features/Match/README.md)
- [State Management Guide](./state-management.md)
- [Component Patterns](./component-patterns.md)

## Next Steps

### Recommended: Goal 5 - Shared State Synchronization Layer

After completing the Match Grid modular refactor, the next logical step is to implement a **Shared State Synchronization Layer** between Match Grid and Backlog features.

#### Why This Is Important

The current architecture has Match and Backlog features working independently with their own stores. While this separation is good, they need better coordination for:

1. **Bi-directional Updates**: When an item is placed in the grid, the backlog needs to update immediately and vice versa
2. **Real-time Consistency**: Both features should always reflect the same source of truth
3. **Database Preparation**: A synchronization layer is the foundation needed before adding database persistence
4. **Undo/Redo**: Shared history management requires coordinated state updates

#### Implementation Plan

**1. Create Synchronization Middleware**
- File: `src/stores/middleware/syncMiddleware.ts`
- Purpose: Intercept store actions and propagate changes between features
- Functionality:
  - Listen to grid item assignments → Update backlog item.matched
  - Listen to backlog item updates → Update corresponding grid items
  - Maintain sync queue for offline operations
  - Handle conflict resolution

**2. Add Event Bus System**
- File: `src/lib/eventBus.ts`
- Purpose: Pub/sub system for cross-feature communication
- Events:
  - `item:assigned` - Item added to grid
  - `item:removed` - Item removed from grid
  - `item:updated` - Item metadata changed
  - `grid:completed` - All positions filled
  - `backlog:refreshed` - Backlog data reloaded

**3. Create Shared State Manager**
- File: `src/stores/shared/matchBacklogSync.ts`
- Purpose: Centralized coordination between Match and Backlog
- Features:
  - Subscribe to both stores
  - Maintain sync status (synced, syncing, error)
  - Queue pending operations
  - Retry failed syncs
  - Expose sync statistics

**4. Add Optimistic Updates**
- Update both stores immediately on user action
- Show loading states during sync
- Rollback on failure
- Show sync status indicator in UI

**5. Implement Sync Status UI**
- Component: `src/components/SyncStatusIndicator.tsx`
- Display:
  - Synced (green checkmark)
  - Syncing (spinner)
  - Error (red warning with retry)
  - Offline queue count

#### Benefits

1. **Performance**: Optimistic updates provide instant feedback
2. **Reliability**: Sync queue ensures no data loss
3. **User Experience**: Clear sync status reduces confusion
4. **Scalability**: Foundation for multi-device sync via database
5. **Debugging**: Centralized sync logic easier to test and debug

#### Integration Points

```typescript
// Match Feature
assignItemToGrid(item, position) {
  // 1. Update grid store (existing)
  gridStore.addItem(item, position);

  // 2. Emit sync event (new)
  eventBus.emit('item:assigned', { item, position });

  // 3. Sync middleware propagates to backlog (new)
  syncMiddleware.propagate('backlog:updateItem', {
    id: item.id,
    matched: true
  });
}

// Backlog Feature
updateBacklogItem(itemId, updates) {
  // 1. Update backlog store (existing)
  backlogStore.updateItem(itemId, updates);

  // 2. Emit sync event (new)
  eventBus.emit('item:updated', { itemId, updates });

  // 3. Sync middleware propagates to grid if needed (new)
  if (updates.matched !== undefined) {
    syncMiddleware.propagate('grid:updateItemStatus', {
      itemId,
      matched: updates.matched
    });
  }
}
```

#### Testing Strategy

1. **Unit Tests**:
   - Sync middleware action interception
   - Event bus pub/sub functionality
   - Conflict resolution logic

2. **Integration Tests**:
   - Grid assignment → Backlog update
   - Backlog update → Grid update
   - Queue persistence and replay
   - Error handling and rollback

3. **E2E Tests**:
   - Complete user workflow with sync
   - Offline mode and queue
   - Multi-tab synchronization

#### Success Criteria

- ✅ Grid and backlog stay synchronized in real-time
- ✅ No data loss during offline operations
- ✅ Clear sync status visible to users
- ✅ <100ms latency for optimistic updates
- ✅ Automatic retry on sync failures

#### Files to Create

```
src/
├── stores/
│   ├── middleware/
│   │   ├── syncMiddleware.ts
│   │   └── index.ts
│   └── shared/
│       ├── matchBacklogSync.ts
│       └── index.ts
├── lib/
│   ├── eventBus.ts
│   └── syncQueue.ts
└── components/
    └── SyncStatusIndicator.tsx
```

This synchronization layer will be the foundation for Goal 6 (Database Persistence) where we'll add Supabase to persist rankings across sessions and devices.

### Alternative Next Goals

**Option B: Advanced Grid Features**
- Bulk operations (multi-select items)
- Grid templates (save/load configurations)
- Custom grid layouts
- Drag-and-drop reordering within grid

**Option C: Enhanced Backlog**
- Smart filters (AI-powered suggestions)
- Import from external sources (Spotify, IMDb)
- Collaborative item suggestions
- Item comparison side-by-side

---

## Feature: Client-Side Hooks Migration & Supabase Integration

### Overview
Consolidated all client-side API hooks into src/hooks/ directory and created Supabase integration layer. This establishes a clear pattern for data fetching and provides migration path from HTTP API to Supabase for better real-time capabilities and built-in authentication.

### New Files Created

#### Supabase Integration Hooks
- **src/hooks/useSupabaseQuery.ts** - Query hook wrapping Supabase operations with React patterns
  - Supports loading, error, and data states
  - Implements caching with configurable stale time
  - Automatic retries with exponential backoff
  - Refetch on window focus (optional)
  - Polling with configurable intervals
  - Paginated query variant for large datasets

- **src/hooks/useSupabaseMutation.ts** - Mutation hook for insert/update/delete operations
  - Optimistic updates with automatic rollback on error
  - Retry logic with exponential backoff
  - OnSuccess/onError/onSettled callbacks
  - Batch mutation variant for multiple operations
  - Sequential or parallel execution modes

- **src/hooks/useSupabaseAuth.ts** - Authentication hook using Supabase Auth
  - Email/password authentication
  - OAuth providers (Google, GitHub, Facebook, Twitter)
  - Magic link (passwordless) authentication
  - Password reset functionality
  - User profile management
  - Session refresh and automatic token renewal
  - Helper hooks: useSupabaseUser, useSupabaseUserRole

#### Configuration & Documentation
- **.env.example** - Environment configuration template
  - Supabase credentials (URL, anon key, service role key)
  - Migration guide from HTTP API to Supabase
  - Security notes and best practices
  - OAuth provider configuration
  - Feature flags for gradual migration
  - Deprecated API_URL marked for removal

- **src/hooks/index.ts** - Central export file for all hooks
  - Organized by category (Supabase, API, UI/UX, Auth, Media)
  - Migration notes and usage guidelines
  - Best practices documentation
  - Type exports for TypeScript support

### Architecture

#### Hook Organization Structure

```
src/hooks/
├── index.ts                        # Central exports with documentation
├── useSupabaseQuery.ts             # Supabase read operations
├── useSupabaseMutation.ts          # Supabase write operations
├── useSupabaseAuth.ts              # Authentication management
├── use-item-groups.ts              # Item groups & backlog (existing)
├── use-top-lists.ts                # Ranked lists management (existing)
├── use-item-research.ts            # AI-powered research (existing)
├── use-backlog-filtering.ts        # Search & filters (existing)
├── use-backlog-selectors.ts        # Memoized selectors (existing)
├── use-toast.ts                    # Toast notifications (existing)
├── use-clerk-user.ts               # Clerk auth (legacy, to be replaced)
├── use-temp-user.ts                # Anonymous users (existing)
├── useScreenCapture.ts             # Screenshot generation (existing)
└── useTwitterShare.ts              # Social sharing (existing)
```

#### Hook Categories

**1. Supabase Integration (New)**
- `useSupabaseQuery` - Read data with caching and retry
- `useSupabaseMutation` - Write data with optimistic updates
- `useSupabaseAuth` - Authentication and session management

**2. API Consumption (Existing - To Be Migrated)**
- `useItemGroups` - Backlog groups and items
- `useTopLists` - Ranked lists CRUD operations
- `useItemResearch` - AI-powered item validation

**3. UI/UX Utilities (Existing)**
- `useBacklogFiltering` - Search and filter state
- `useBacklogSelectors` - Memoized data selectors
- `useToast` - User notifications

**4. Authentication (Mixed)**
- `useSupabaseAuth` - New Supabase-based auth
- `useClerkUser` - Legacy Clerk auth (to be replaced)
- `useTempUser` - Anonymous session management

**5. Media & Sharing (Existing)**
- `useScreenCapture` - Screenshot generation
- `useTwitterShare` - Social media integration

### Data Flow Patterns

#### Current Pattern (HTTP API)
```
Component
  ↓
useItemGroups (React Query)
  ↓
itemGroupsApi
  ↓
apiClient (fetch)
  ↓
HTTP API Server
```

#### New Pattern (Supabase)
```
Component
  ↓
useSupabaseQuery
  ↓
Supabase Client
  ↓
Supabase Backend (PostgreSQL + Auth + Storage)
```

#### Migration Strategy
```
Phase 1: Setup (Current)
- ✅ Create Supabase integration hooks
- ✅ Configure environment variables
- ✅ Document migration path

Phase 2: Parallel Systems
- Run HTTP API and Supabase side-by-side
- Migrate one feature module at a time
- Test thoroughly before next migration

Phase 3: Complete Migration
- All components using Supabase hooks
- Remove HTTP API dependencies
- Delete legacy hooks and client code
```

### New Patterns & Architectural Decisions

#### 1. Hook Consolidation Pattern
**Decision:** All custom hooks in single src/hooks/ directory
**Rationale:**
- Single source of truth for data fetching
- Easy to discover and reuse hooks
- Consistent patterns across codebase
- Simplified imports with barrel export (index.ts)
- Clear separation from component logic

#### 2. Supabase Adapter Layer
**Decision:** Wrap Supabase client in React hooks with React Query-like API
**Rationale:**
- Familiar API for developers used to React Query
- Consistent loading/error state patterns
- Built-in retry and caching logic
- Easy to test and mock
- Gradual migration path from existing hooks

#### 3. Environment-Based Migration
**Decision:** Use feature flags to enable/disable Supabase vs HTTP API
**Rationale:**
- Safe gradual rollout
- A/B testing capabilities
- Quick rollback if issues found
- Test both systems in parallel
- Minimize user impact during migration

#### 4. Dual Hook Pattern
**Decision:** Keep both HTTP API hooks and Supabase hooks during migration
**Rationale:**
- Zero downtime migration
- Feature-by-feature testing
- Rollback capability
- Team can work in parallel
- Reduces risk of breaking changes

#### 5. Central Export Pattern
**Decision:** Single index.ts with categorized exports and documentation
**Rationale:**
- Easy to discover available hooks
- Self-documenting codebase
- Consistent import paths
- Migration guidance built-in
- Best practices documented at import site

### API Hook Comparison

#### HTTP API Hook (Current)
```typescript
const { data, isLoading, error } = useItemGroups({
  category: 'movies',
  subcategory: 'action',
});

// Pros: Simple, familiar React Query patterns
// Cons: Requires backend API, no real-time, manual auth
```

#### Supabase Hook (New)
```typescript
const { data, isLoading, error } = useSupabaseQuery(
  ['item-groups', 'movies', 'action'],
  async (client) => {
    const { data, error } = await client
      .from('item_groups')
      .select('*')
      .eq('category', 'movies')
      .eq('subcategory', 'action');

    if (error) throw error;
    return data;
  }
);

// Pros: Real-time capable, built-in auth, no backend needed
// Cons: More verbose, requires Supabase setup
```

### Migration Path

#### Step 1: Environment Setup
```bash
# 1. Copy .env.example to .env.local
cp .env.example .env.local

# 2. Add Supabase credentials from dashboard
# https://app.supabase.com/project/_/settings/api

# 3. Enable Supabase in environment
NEXT_PUBLIC_ENABLE_SUPABASE=true
NEXT_PUBLIC_ENABLE_LEGACY_API=true  # Keep both during migration
```

#### Step 2: Database Schema
```sql
-- Create tables matching existing API structure
CREATE TABLE item_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  image_url TEXT,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add Row Level Security
ALTER TABLE item_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON item_groups FOR SELECT
  USING (true);
```

#### Step 3: Component Migration
```typescript
// Before (HTTP API)
import { useItemGroups } from '@/hooks';

const BacklogGroups = () => {
  const { data, isLoading } = useItemGroups({ category });
  // ... component logic
};

// After (Supabase)
import { useSupabaseQuery } from '@/hooks';

const BacklogGroups = () => {
  const { data, isLoading } = useSupabaseQuery(
    ['item-groups', category],
    async (client) => {
      const { data, error } = await client
        .from('item_groups')
        .select('*')
        .eq('category', category);

      if (error) throw error;
      return data;
    }
  );
  // ... component logic (unchanged)
};
```

#### Step 4: Feature Testing
- Test each migrated feature thoroughly
- Verify data consistency between systems
- Check loading and error states
- Ensure authentication works correctly
- Test real-time updates (if enabled)

#### Step 5: Cleanup
```typescript
// Remove legacy hooks after all features migrated
// Delete: src/hooks/use-item-groups.ts (old HTTP version)
// Delete: src/lib/api/item-groups.ts
// Delete: src/lib/api/client.ts
// Update: .env.example (remove API_URL)
```

### Benefits of Migration

**1. Real-Time Capabilities**
- Live updates without polling
- Collaborative features enabled
- Instant data synchronization
- WebSocket connections built-in

**2. Built-In Authentication**
- Email/password, OAuth, magic links
- Session management automatic
- Row Level Security for data protection
- User metadata storage included

**3. Reduced Complexity**
- No separate backend API needed
- Automatic API from database schema
- Type-safe queries with TypeScript
- Less code to maintain

**4. Better Developer Experience**
- Generated TypeScript types
- Automatic API documentation
- Admin dashboard included
- Easy local development

**5. Scalability**
- Built on PostgreSQL
- Horizontal scaling available
- CDN for static assets
- Optimized query performance

### Testing Strategy

**Unit Tests**
- Test hooks in isolation with mock Supabase client
- Verify retry logic and error handling
- Test optimistic updates and rollback
- Validate query key generation

**Integration Tests**
- Test hook + Supabase interaction
- Verify authentication flow
- Test real-time subscriptions
- Validate RLS policies

**E2E Tests**
- Test complete user workflows
- Verify data persistence
- Test offline/online transitions
- Validate session management

### Security Considerations

**1. Environment Variables**
- ✅ NEXT_PUBLIC_SUPABASE_URL - Safe for client
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY - Safe for client (RLS enforced)
- ⚠️ SUPABASE_SERVICE_ROLE_KEY - Server-side ONLY (bypasses RLS)

**2. Row Level Security**
- Enable RLS on all tables
- Create policies for read/write access
- Test policies thoroughly
- Use user context in policies

**3. Authentication**
- Use Supabase Auth for user management
- Enable email confirmation
- Configure OAuth carefully
- Rotate keys if exposed

### Performance Optimizations

**1. Caching Strategy**
- Default staleTime: 0ms (always fresh)
- Default cacheTime: 5 minutes
- Configurable per query
- Automatic cache invalidation

**2. Query Optimization**
- Select only needed columns
- Use indexes for frequent queries
- Limit results with pagination
- Use count() for totals only

**3. Real-Time Subscriptions**
- Subscribe only to needed tables
- Filter subscriptions server-side
- Unsubscribe on component unmount
- Batch updates when possible

### Files Modified

**New Files:**
- src/hooks/useSupabaseQuery.ts
- src/hooks/useSupabaseMutation.ts
- src/hooks/useSupabaseAuth.ts
- src/hooks/index.ts
- .env.example

**Existing Files (No Changes):**
- src/hooks/use-item-groups.ts (ready for migration)
- src/hooks/use-top-lists.ts (ready for migration)
- src/hooks/use-item-research.ts (ready for migration)
- All other existing hooks (unchanged)

### Dependencies

**Required (To Be Added):**
```json
{
  "@supabase/supabase-js": "^2.x.x"
}
```

**Existing:**
- @tanstack/react-query (compatible with new hooks)
- React 19.x
- Next.js 15.x

---

## Feature: Complete Hooks Migration & Consolidation

### Overview
Completed the migration of all client-side API hooks to src/hooks/ directory. This phase moved remaining utility hooks (useLoadingStateMachine and useSwipeGesture) from their scattered locations into the centralized hooks directory, establishing a single source of truth for all custom hooks in the application.

### Files Moved

#### From src/lib/hooks/
- **useLoadingStateMachine.ts** → **src/hooks/useLoadingStateMachine.ts**
  - State machine for complex loading states with error handling
  - Supports multiple loading phases (LIST, FETCH, BACKLOG)
  - Categorized error types (NETWORK, VALIDATION, SERVER, UNKNOWN)
  - Recovery action support with retry logic
  - Progress tracking for each loading phase

#### From src/lib/gestures/
- **useSwipeGesture.ts** → **src/hooks/useSwipeGesture.ts**
  - Mobile-optimized swipe gesture detection
  - Velocity and distance tracking
  - Direction detection (left, right, up, down)
  - Configurable thresholds and debouncing
  - Touch event handling with prevent scroll
- **types.ts** → **src/hooks/useSwipeGesture.types.ts**
  - Type definitions for swipe gestures
  - SwipeDirection, SwipeEvent, TouchPosition
  - SwipeConfig and SwipeCallbacks interfaces

### Files Updated

#### Hook Exports
- **src/hooks/index.ts** - Added exports for:
  - `useLoadingStateMachine` with all types and utilities
  - `useSwipeGesture` with type exports
  - Organized under "UI/State Management Hooks" section

#### Import Statements Updated
- **src/app/match/page.tsx** - Updated to import from `@/hooks`
- **src/components/ui/loading-state-indicator.tsx** - Updated LoadingState import
- **src/app/features/Match/components/LoadingErrorBoundary.tsx** - Updated imports
- **src/app/features/matching/components/SwipeableCard.tsx** - Updated to import from `@/hooks`

### Architecture Benefits

#### 1. Single Source of Truth
All custom hooks now live in `src/hooks/` directory:
- ✅ Supabase integration hooks (Query, Mutation, Auth)
- ✅ API consumption hooks (ItemGroups, TopLists, ItemResearch)
- ✅ UI/UX hooks (BacklogFiltering, BacklogSelectors, Toast)
- ✅ Authentication hooks (SupabaseAuth, ClerkUser, TempUser)
- ✅ Media hooks (ScreenCapture, TwitterShare)
- ✅ State management hooks (LoadingStateMachine) ⬅️ NEW
- ✅ Gesture hooks (SwipeGesture) ⬅️ NEW

#### 2. Consistent Import Pattern
```typescript
// Before (scattered imports)
import { useLoadingStateMachine } from '@/lib/hooks/useLoadingStateMachine';
import { useSwipeGesture } from '@/lib/gestures/useSwipeGesture';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';

// After (unified imports)
import {
  useLoadingStateMachine,
  useSwipeGesture,
  useSupabaseQuery,
} from '@/hooks';
```

#### 3. Better Discoverability
- All hooks exported from single index.ts
- Categorized by functionality
- Comprehensive documentation in exports
- Type exports included

#### 4. Simplified Refactoring
- Easier to locate and update hooks
- Clear separation from other utilities
- Consistent file naming conventions
- Better IDE autocomplete support

### Hook Categories (Complete)

**Supabase Integration:**
- useSupabaseQuery - Data fetching with caching
- useSupabaseMutation - Data mutations with optimistic updates
- useSupabaseAuth - Authentication and session management

**API Consumption:**
- useItemGroups - Backlog groups and items
- useTopLists - Ranked lists management
- useItemResearch - AI-powered item validation

**UI/UX Utilities:**
- useBacklogFiltering - Search and filters
- useBacklogSelectors - Memoized selectors
- useToast - User notifications

**State Management:** ⬅️ NEW CATEGORY
- useLoadingStateMachine - Complex loading states
  - Multiple loading phases
  - Error categorization
  - Recovery actions
  - Progress tracking

**Gesture Detection:** ⬅️ NEW CATEGORY
- useSwipeGesture - Mobile swipe detection
  - Velocity tracking
  - Distance calculation
  - Direction detection
  - Debouncing

**Authentication:**
- useSupabaseAuth - Supabase Auth
- useClerkUser - Clerk Auth (legacy)
- useTempUser - Anonymous sessions

**Media & Sharing:**
- useScreenCapture - Screenshot generation
- useTwitterShare - Social media integration

### Migration Impact

**Components Updated:** 4 files
- src/app/match/page.tsx
- src/components/ui/loading-state-indicator.tsx
- src/app/features/Match/components/LoadingErrorBoundary.tsx
- src/app/features/matching/components/SwipeableCard.tsx

**Legacy Locations Deprecated:**
- ❌ src/lib/hooks/ (empty, can be removed)
- ❌ src/lib/gestures/ (index.ts updated, original files can be removed)

**Breaking Changes:** None
- All imports updated in same commit
- No API changes to hook interfaces
- Backward compatibility maintained

### Next Steps

### Recommended: Component Migration to Supabase Hooks

After establishing the Supabase integration layer and consolidating all hooks, the next step is to **migrate React components** to use the new hooks from src/hooks/.

#### Why This Is Important

1. **Enable Real-Time Features**: Unlock collaborative ranking and live updates
2. **Simplify Backend**: Remove dependency on separate HTTP API server
3. **Improve Security**: Leverage Row Level Security for data protection
4. **Better DX**: Type-safe queries with generated TypeScript types
5. **Reduce Latency**: Direct database access without API middleware

#### Implementation Plan

**Phase 1: Setup Supabase Project**
1. Create Supabase project at https://app.supabase.com
2. Configure environment variables in .env.local
3. Install @supabase/supabase-js package
4. Test connection with simple query

**Phase 2: Database Schema Migration**
1. Create tables matching existing API structure:
   - `item_groups` - Backlog groups
   - `backlog_items` - Individual items
   - `top_lists` - Ranked lists
   - `list_items` - Items in lists with rankings
   - `users` - User profiles (extends auth.users)
2. Set up Row Level Security policies
3. Create indexes for performance
4. Migrate existing data (if any)

**Phase 3: Feature-by-Feature Migration**

**Module 1: Backlog Groups (Highest Priority)**
- **Files to Update:**
  - src/app/features/Backlog/BacklogGroups.tsx
  - src/app/features/Backlog/BacklogGroup/BacklogGroup.tsx
  - src/stores/backlog/actions-data.ts
- **Hook Migration:**
  - `useGroupsByCategory` → `useSupabaseQuery` with item_groups table
  - `useItemGroup` → `useSupabaseQuery` with single group + items
  - `useCreateItemGroup` → `useSupabaseMutation` for insert
- **Testing:**
  - Verify groups load correctly
  - Test search and filtering
  - Validate item counts
  - Check loading states

**Module 2: Match Grid (High Priority)**
- **Files to Update:**
  - src/app/features/Match/MatchContainer.tsx
  - src/stores/item-store/index.ts
- **Hook Migration:**
  - Grid state persistence to Supabase
  - Real-time updates for collaborative features
  - Session management with auth
- **Testing:**
  - Verify grid items persist
  - Test drag and drop
  - Validate rankings saved
  - Check multi-user scenarios

**Module 3: Top Lists Management (Medium Priority)**
- **Files to Update:**
  - src/app/features/Landing/UserListsSection.tsx
  - src/app/features/Landing/CompositionModal.tsx
- **Hook Migration:**
  - `useTopLists` → `useSupabaseQuery` for list fetching
  - `useCreateListWithUser` → `useSupabaseMutation` with user creation
  - `useUpdateList` → `useSupabaseMutation` for updates
- **Testing:**
  - Verify list creation
  - Test list updates
  - Validate user association
  - Check analytics

**Module 4: Authentication (Medium Priority)**
- **Files to Update:**
  - Remove Clerk dependencies
  - Update auth context providers
  - Migrate user profile management
- **Hook Migration:**
  - Replace Clerk with `useSupabaseAuth`
  - Update protected routes
  - Migrate user metadata
- **Testing:**
  - Verify login/logout
  - Test OAuth providers
  - Validate session persistence
  - Check protected routes

**Module 5: Item Research (Lower Priority)**
- **Files to Update:**
  - Components using `useItemResearch`
  - AI integration endpoints
- **Hook Migration:**
  - Store research results in Supabase
  - Cache AI responses
  - Track research history
- **Testing:**
  - Verify research works
  - Test caching
  - Validate history

**Phase 4: Enable Real-Time Features**
1. Add Supabase real-time subscriptions
2. Update components to handle live data
3. Implement collaborative ranking
4. Add presence indicators

**Phase 5: Cleanup & Optimization**
1. Remove HTTP API client code
2. Delete legacy hooks
3. Update environment variables
4. Remove unused dependencies
5. Optimize queries with indexes
6. Implement caching strategy

#### Success Criteria

- ✅ All components using Supabase hooks
- ✅ No HTTP API dependencies remaining
- ✅ Authentication working with Supabase Auth
- ✅ Real-time updates functional
- ✅ Data persistence working
- ✅ Performance equal or better than before
- ✅ All tests passing

#### Files to Create/Modify

**New Files:**
```
src/
├── api/
│   └── supabase-adapter.ts         # Supabase client configuration
├── types/
│   └── supabase.ts                  # Generated types from schema
└── lib/
    └── supabase/
        ├── queries.ts               # Common query builders
        ├── mutations.ts             # Common mutation builders
        └── subscriptions.ts         # Real-time subscriptions
```

**Files to Modify:**
```
src/app/features/
├── Backlog/
│   ├── BacklogGroups.tsx            # useGroupsByCategory → useSupabaseQuery
│   └── BacklogGroup/
│       └── BacklogGroup.tsx         # useItemGroup → useSupabaseQuery
├── Match/
│   └── MatchContainer.tsx           # Add persistence with useSupabaseMutation
└── Landing/
    ├── UserListsSection.tsx         # useTopLists → useSupabaseQuery
    └── CompositionModal.tsx         # useCreateList → useSupabaseMutation
```

#### Risk Mitigation

1. **Dual System Approach**: Run both APIs in parallel during migration
2. **Feature Flags**: Enable/disable Supabase per feature
3. **Incremental Rollout**: One component at a time
4. **Monitoring**: Track errors and performance
5. **Rollback Plan**: Keep HTTP API functional until 100% migrated

#### Timeline Estimate

- Phase 1: Supabase Setup - 1-2 days
- Phase 2: Schema Migration - 2-3 days
- Phase 3: Component Migration - 5-7 days (1-2 days per module)
- Phase 4: Real-Time Features - 2-3 days
- Phase 5: Cleanup - 1-2 days

**Total: 11-17 days** (with testing)

### Alternative Next Steps

**Option B: Optimize Existing HTTP API**
- Add caching layer
- Implement request batching
- Optimize query performance
- Add monitoring and logging

**Option C: Real-Time Sync Layer First**
- Build sync middleware (as outlined earlier)
- Establish event bus system
- Add optimistic updates
- Then migrate to Supabase

**Option D: Enhanced Testing Infrastructure**
- Add unit tests for all hooks
- Implement integration tests
- Set up E2E testing
- Add performance benchmarks

---

## Feature: Supabase SQL Migration Scripts

### Overview
Created comprehensive SQL migration scripts in src/api/migrations/ that define the complete database schema for Supabase. These migrations establish all tables, relationships, indexes, triggers, and helper functions needed to support the application's data model, enabling developers to recreate the entire database structure using the Supabase dashboard or CLI.

### New Files Created

#### Migration Scripts
- **src/api/migrations/001_create_top_lists_table.sql** - Top lists table with RLS policies and triggers
  - `top_lists` table with columns: id, title, description, category, subcategory, user_id, predefined, size, time_period, created_at, updated_at
  - Indexes for common query patterns (user_id, category, subcategory, predefined)
  - Composite indexes for multi-column queries
  - Row Level Security policies (commented, ready to enable)
  - Automatic updated_at trigger
  - Table and column comments for documentation

- **src/api/migrations/002_create_top_items_table.sql** - Items and list-item relationships
  - `top_items` table with columns: id, name, description, category, subcategory, group_name, item_year, item_year_to, image_url, tags, reference_url, created_at, updated_at
  - `list_items` junction table linking lists to items with position
  - Indexes for category, group, year, tags (GIN index for arrays)
  - Full-text search index for name and description
  - Triggers to update parent list timestamp when items change
  - Check constraints for year range and position validity
  - Cascading deletes for referential integrity

- **src/api/migrations/003_create_item_groups_table.sql** - Item grouping and relationships
  - `item_groups` table with columns: id, name, description, category, subcategory, image_url, item_count, created_at, updated_at
  - `item_group_members` junction table linking items to groups
  - Automatic item_count maintenance via triggers
  - Synchronization of denormalized group_name field in top_items
  - Helper function `get_group_items()` to retrieve all items in a group
  - Helper function `recalculate_group_item_counts()` for data consistency
  - Unique constraint ensuring group names are unique within categories

- **src/api/migrations/004_create_research_requests_table.sql** - Item research tracking and caching
  - `item_research_requests` table with columns: id, name, category, subcategory, validation results, duplicate detection, research results, metadata
  - Custom ENUM types for research_depth and duplicate_action
  - Duplicate detection fields: is_duplicate, duplicate_count, existing_item_ids, similarity_scores, exact_match
  - Research metadata: llm_confidence, web_sources_found, research_method, research_errors
  - Item creation tracking: item_created, item_id
  - Automatic completed_at timestamp trigger
  - View `recent_research_results` for caching (30-day window)
  - Helper function `find_similar_research()` for cache lookups
  - Check constraints for confidence range (0-1) and data validity

#### Documentation
- **src/api/migrations/README.md** - Comprehensive migration guide
  - Three methods for applying migrations (Dashboard, CLI, Local)
  - Database schema overview with all tables and relationships
  - Key features: automatic timestamps, indexes, data integrity, RLS
  - Customization guide for auth integration and custom fields
  - Verification queries to confirm successful migration
  - Rollback scripts for cleanup
  - Next steps for post-migration integration
  - Security considerations and performance optimizations

### Database Schema Design

#### Entity Relationship Diagram

```
users (Supabase Auth)
  ↓
top_lists ────────┐
  ↓               │
list_items ───────┼──→ top_items ←──── item_group_members ←──── item_groups
  (position)      │       ↑                                          ↑
                  │       │                                          │
                  │       └── group_name (denormalized) ─────────────┘
                  │
                  └──→ item_research_requests
                          (tracks AI research and validation)
```

#### Table Relationships

**top_lists** (1:N) **list_items** (N:1) **top_items**
- A list has many items through list_items junction table
- Each list_items entry has a position (ranking)
- Cascading delete: removing list deletes its list_items

**item_groups** (1:N) **item_group_members** (N:1) **top_items**
- An item can belong to multiple groups
- Groups track item_count automatically
- Denormalized group_name in top_items for backward compatibility

**top_items** (1:N) **item_research_requests**
- Research requests optionally link to created items
- Tracks duplicate detection and AI confidence
- Caching layer for recent research (30 days)

### Architecture Decisions

#### 1. UUID Primary Keys
**Decision:** Use UUID for all primary keys
**Rationale:**
- Distributed system friendly
- No ID collision in multi-source inserts
- Secure (not sequential, harder to guess)
- Supabase best practice

#### 2. Denormalized group_name Field
**Decision:** Store group_name in top_items table despite having item_group_members
**Rationale:**
- Backward compatibility with existing TypeScript interfaces
- Query performance for simple group lookups
- Automatic synchronization via triggers maintains consistency
- Trade-off: slight redundancy for significant performance gain

#### 3. Junction Tables with Metadata
**Decision:** list_items includes position, not just foreign keys
**Rationale:**
- Position is property of relationship, not item
- Same item can have different positions in different lists
- Unique constraints enforce one position per item per list
- Follows normalized database design

#### 4. Array Fields (tags, existing_item_ids)
**Decision:** Use PostgreSQL array types for multi-value fields
**Rationale:**
- Native PostgreSQL feature
- GIN indexes enable efficient array searches
- Type-safe with generated TypeScript types
- Avoids separate junction table for simple arrays

#### 5. Automatic Timestamp Management
**Decision:** created_at/updated_at with triggers instead of manual updates
**Rationale:**
- Eliminates developer error
- Consistent timestamps across all tables
- Cascading updates (list updated when items change)
- Database-level enforcement

#### 6. Row Level Security (Optional)
**Decision:** Include RLS policies but keep them commented out
**Rationale:**
- Security best practice
- Ready to enable when auth system finalized
- Policies serve as documentation
- Allows gradual security hardening

#### 7. Full-Text Search Indexes
**Decision:** GIN indexes on searchable text fields
**Rationale:**
- Fast text searches (name, description)
- Supports LIKE, ILIKE, and full-text queries
- Essential for user-facing search features
- PostgreSQL-optimized

#### 8. Comprehensive Comments
**Decision:** Add SQL comments on tables and columns
**Rationale:**
- Self-documenting database schema
- Visible in Supabase dashboard
- Helps new developers understand structure
- Professional database management practice

### Integration with TypeScript Types

#### Type Mapping

**SQL → TypeScript:**
- UUID → string
- TEXT → string
- INTEGER → number
- BOOLEAN → boolean
- TIMESTAMP WITH TIME ZONE → string (ISO 8601)
- TEXT[] → string[]
- NUMERIC(3,2) → number
- ENUM → union type

#### Example: TopList Interface Alignment

**SQL (001_create_top_lists_table.sql):**
```sql
CREATE TABLE top_lists (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  user_id UUID,
  predefined BOOLEAN DEFAULT FALSE,
  size INTEGER NOT NULL DEFAULT 10,
  time_period TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**TypeScript (src/types/top-lists.ts):**
```typescript
export interface TopList {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  user_id?: string;
  predefined?: boolean;
  size: number;
  time_period?: string;
  created_at: string;
  updated_at?: string;
}
```

### Key Features

#### 1. Automatic Maintenance
- **updated_at Triggers**: All tables automatically update timestamp
- **item_count Triggers**: Groups maintain accurate item counts
- **completed_at Triggers**: Research requests auto-complete
- **Cascading Updates**: List timestamp updates when items change

#### 2. Performance Optimization
- **Strategic Indexes**: Cover common query patterns
- **Composite Indexes**: Multi-column query optimization
- **GIN Indexes**: Fast array and full-text searches
- **Unique Constraints**: Prevent duplicates at database level

#### 3. Data Integrity
- **Foreign Keys**: Enforce referential integrity
- **Check Constraints**: Validate data at insert/update
- **Unique Constraints**: Prevent duplicate entries
- **NOT NULL**: Required fields enforced

#### 4. Developer Experience
- **Helper Functions**: `get_group_items()`, `find_similar_research()`
- **Views**: `recent_research_results` for common queries
- **Comments**: Every table and column documented
- **Rollback Scripts**: Easy cleanup in README

#### 5. Flexibility
- **RLS Ready**: Security policies included but optional
- **Custom ENUMs**: Type-safe research options
- **Extensible**: Easy to add columns and indexes
- **Migration Pattern**: Numbered files for sequential application

### Migration Application Flow

```
Developer
  ↓
1. Read README.md
  ↓
2. Apply 001_create_top_lists_table.sql
  ↓ (creates lists table + triggers)
3. Apply 002_create_top_items_table.sql
  ↓ (creates items + junction tables)
4. Apply 003_create_item_groups_table.sql
  ↓ (creates groups + member tables)
5. Apply 004_create_research_requests_table.sql
  ↓ (creates research tracking)
6. Verify with SQL queries
  ↓
7. Configure RLS if needed
  ↓
8. Update API code to use Supabase client
```

### Next Steps After Migration

**Immediate (Post-Migration):**
1. **Test Schema**: Insert sample data to verify constraints
2. **Configure RLS**: Enable and customize security policies
3. **Integrate Auth**: Connect with Supabase Auth or custom provider
4. **Generate Types**: Use Supabase CLI to generate TypeScript types

**Short-Term (Next Sprint):**
1. **Migrate API Modules**: Update top-lists.ts, top-items.ts, item-groups.ts to use Supabase queries
2. **Update Hooks**: Migrate useItemGroups, useTopLists to useSupabaseQuery
3. **Test Integration**: Verify all CRUD operations work
4. **Remove HTTP API**: Clean up legacy client code

**Long-Term (Future Features):**
1. **Real-Time Subscriptions**: Add live updates using Supabase real-time
2. **Collaborative Features**: Enable multi-user ranking sessions
3. **Advanced Analytics**: Query aggregation for statistics
4. **Data Migration**: Import existing data from HTTP API

### Files Modified (Summary)

**Created:**
- src/api/migrations/001_create_top_lists_table.sql (87 lines)
- src/api/migrations/002_create_top_items_table.sql (169 lines)
- src/api/migrations/003_create_item_groups_table.sql (209 lines)
- src/api/migrations/004_create_research_requests_table.sql (244 lines)
- src/api/migrations/README.md (406 lines)

**Total:** 5 new files, 1,115 lines of SQL and documentation

### Dependencies

**Required:**
- PostgreSQL 15+ (provided by Supabase)
- uuid-ossp extension (for UUID generation)

**Supabase Features Used:**
- PostgreSQL database
- Row Level Security (optional)
- Auto-generated API
- Type generation CLI
- Admin dashboard

### Benefits

1. **Reproducible Setup**: Any developer can recreate database from scripts
2. **Version Control**: SQL migrations tracked in Git
3. **Documentation**: Schema self-documented with comments
4. **Type Safety**: Aligns with existing TypeScript interfaces
5. **Best Practices**: Follows PostgreSQL and Supabase conventions
6. **Performance**: Optimized indexes from the start
7. **Security**: RLS policies included for easy enablement
8. **Maintainability**: Clear separation of concerns by migration

## Next Steps

### Recommended: Migrate API Modules to Use Supabase Client

After creating the SQL migration scripts, the next logical step is to **migrate the API layer** (src/lib/api/) to use Supabase queries instead of HTTP calls.

#### Why This Is Important

1. **Complete the Integration**: SQL schema is ready, now connect it to application code
2. **Eliminate Backend Dependency**: Remove need for separate HTTP API server
3. **Enable Real-Time**: Supabase client supports real-time subscriptions
4. **Type Safety**: Generate types from schema for compile-time safety
5. **Better Performance**: Direct database queries without HTTP overhead

#### Implementation Plan

**1. Install Supabase Client**
```bash
npm install @supabase/supabase-js
```

**2. Configure Supabase Client**
- File: `src/lib/supabase/client.ts`
- Initialize with environment variables
- Export typed client instance

**3. Update API Modules**

**Module: top-lists.ts**
```typescript
// Before (HTTP)
export const topListsApi = {
  getLists: async (params?: SearchListsParams): Promise<TopList[]> => {
    return apiClient.get<TopList[]>(LISTS_ENDPOINT, params);
  }
};

// After (Supabase)
export const topListsApi = {
  getLists: async (params?: SearchListsParams): Promise<TopList[]> => {
    let query = supabase.from('top_lists').select('*');

    if (params?.category) query = query.eq('category', params.category);
    if (params?.user_id) query = query.eq('user_id', params.user_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
```

**Module: top-items.ts**
- Update searchItems to use Supabase query builder
- Implement filtering with .eq(), .ilike(), .contains()
- Add pagination with .range()

**Module: item-groups.ts**
- Query item_groups table
- Include related items with .select('*, items:item_group_members(*)')
- Implement count aggregation

**Module: item-research.ts**
- Insert research requests to database
- Query for duplicate detection
- Use find_similar_research() helper function

**4. Generate TypeScript Types**
```bash
npx supabase gen types typescript --project-id your-project-ref > src/types/supabase.ts
```

**5. Update Components**
- Components using hooks remain unchanged
- Hooks now call Supabase-backed API functions
- Maintain backward compatibility

**6. Testing Strategy**
- Unit test each API function with mock Supabase client
- Integration test with real Supabase instance
- E2E test complete user workflows

#### Migration Priority

**High Priority (Core Features):**
1. top-lists.ts - User lists and composition
2. item-groups.ts - Backlog groups and items
3. top-items.ts - Item search and filtering

**Medium Priority (Supporting Features):**
4. item-research.ts - AI-powered research

**Low Priority (Future):**
5. Analytics and reporting queries
6. Real-time subscriptions

#### Success Criteria

- ✅ All API modules using Supabase client
- ✅ HTTP API client removed
- ✅ Type safety with generated types
- ✅ Tests passing
- ✅ No breaking changes to components
- ✅ Performance equal or better

#### Files to Create/Modify

**New Files:**
```
src/lib/supabase/
├── client.ts                    # Supabase client configuration
├── queries.ts                   # Common query builders
└── mutations.ts                 # Common mutation builders

src/types/
└── supabase.ts                  # Generated from schema
```

**Files to Modify:**
```
src/lib/api/
├── top-lists.ts                 # Replace HTTP with Supabase
├── top-items.ts                 # Replace HTTP with Supabase
├── item-groups.ts               # Replace HTTP with Supabase
└── item-research.ts             # Replace HTTP with Supabase
```

**Files to Delete (Eventually):**
```
src/lib/api/
└── client.ts                    # HTTP client no longer needed
```

#### Timeline Estimate

- Supabase client setup: 1-2 hours
- Type generation: 30 minutes
- top-lists.ts migration: 2-3 hours
- item-groups.ts migration: 2-3 hours
- top-items.ts migration: 2-3 hours
- item-research.ts migration: 1-2 hours
- Testing and verification: 2-3 hours

**Total: 11-16 hours** (1-2 days)

### Alternative Next Steps

**Option B: Real-Time Subscriptions**
- Add Supabase real-time listeners
- Update UI automatically on database changes
- Enable collaborative features
- Show presence indicators

**Option C: Enhanced Authentication**
- Migrate from Clerk to Supabase Auth
- Implement OAuth providers
- Add magic link authentication
- Set up user profile management

**Option D: Advanced Database Features**
- Add database functions for complex queries
- Implement triggers for business logic
- Create materialized views for analytics
- Set up database backups and monitoring

---

*Last Updated: January 29, 2025*
*Feature: Supabase SQL Migration Scripts - Complete*
