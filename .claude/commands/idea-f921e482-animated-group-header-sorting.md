# Animated Group Header Sorting

## Metadata
- **Category**: ui
- **Effort**: Medium (2/3)
- **Impact**: High (3/3)
- **Scan Type**: delight_designer
- **Generated**: 11/6/2025, 9:34:48 PM

## Description
Introduce a subtle sorting animation when backlog groups are reordered or when the sidebar loads. Each group row will slide into its new position with a gentle easing curve and a brief highlight. The animation leverages CSS transitions and minimal JS to keep performance high.

## Reasoning
This gives users instant visual feedback that the sorting logic works, reinforcing confidence. It also improves perceived performance by making changes feel smooth rather than jarring. The effect aligns with the backlog redesign goal by making group ordering more intuitive.

## Context

**Note**: This section provides supporting architectural documentation and is NOT a hard requirement. Use it as guidance to understand existing code structure and maintain consistency.

### Context: Match Grid

**Description**: # Feature: Match Collections & Related Stores

## 1. Overview

The **Match Collections** feature is a modular React‑based UI component that displays and manages a grid of "matches" (e.g., product matches, user matches, or any pairings). It provides drag‑and‑drop support for rearranging or assigning matches to different categories, and is tightly coupled with a set of state stores that persist user actions and session data.

### Problem Solved
- **Visual organization** of large lists of matches in a concise, sortable grid.
- **Interactive manipulation** (drag‑and‑drop) of matches between collections.
- **Persistent session** handling for both client‑side state (grid layout, backlog) and server‑side synchronization (top‑lists, backlog groups).
- **Centralized type safety** across all match‑related data structures.

### Who Uses It
- **Product managers** who need to review and re‑arrange match data.
- **Frontend developers** building dashboards that require drag‑and‑drop.
- **API developers** who need to expose and consume match/top‑list endpoints.
- **QA engineers** verifying state persistence and UI behaviour.

## 2. Architecture

The implementation follows a **feature‑centric** architecture, leveraging React hooks, TypeScript, and a small state‑management layer (custom stores). The key architectural patterns are:

1. **React Component Tree** – UI is split into small, reusable components.
2. **Custom Store Pattern** – Simple, lightweight stores (`backlog-store`, `grid-store`, `session-store`, `use-list-store`) expose `subscribe`/`getState` APIs and are used via hooks.
3. **Type‑Safe Domain Layer** – All data shapes are defined in `types.ts`, ensuring consistent typing across UI, stores, and API.
4. **Hook‑Based Side Effects** – `use-top-lists`, `use-toast`, and `use-list-store` encapsulate async logic and side‑effects.
5. **Separation of Concerns** – UI (components) is separated from data (stores, API, types) and from session handling (session manager).

### Key Components
- **SimpleMatchGrid** – Main grid UI that renders matches and handles drag events.
- **SimpleDropZone** – Receives dropped items and forwards them to the appropriate store.
- **Collection Index** – Exposes CRUD helpers for match collections.
- **Backlog / Grid Stores** – Persist current state of matches and layout.
- **Session Store / Manager** – Keeps session tokens, user info, and syncs with server.
- **Hooks** – `use-top-lists` fetches top‑list data; `use-toast` displays notifications; `use-list-store` bridges UI with list store.
- **API Layer** – `top-lists.ts` performs REST calls; `query-keys/top-lists.ts` defines query keys for data‑fetching libraries (e.g., React‑Query).
- **Types** – Domain types for backlog groups, matches, and top‑lists.

## 3. File Structure

```text
src/
├─ app/
│  └─ features/
│     ├─ Match/
│     │  └─ sub_MatchCollections/
│     │     ├─ SimpleMatchGrid.tsx   # Grid UI + drag‑and‑drop logic
│     │     └─ SimpleDropZone.tsx    # Drop target component
│     └─ Collection/
│        ├─ index.ts                 # Public API for collection CRUD
│        └─ types.ts                 # Types used by Collection helpers
├─ stores/
│  ├─ backlog-store.ts          # Handles backlog state
│  ├─ grid-store.ts             # Handles grid layout state
│  ├─ session-store.ts          # Handles user session persistence
│  ├─ use-list-store.ts         # Hook that exposes list‑store functionality
│  ├─ backlog/
│  │  └─ index.ts              # Backlog‑specific logic
│  └─ item-store/
│     ├─ session-manager.ts     # Session token logic for items
│     └─ types.ts                # Item store domain types
├─ types/
│  ├─ backlog-groups.ts        # Types for backlog groups
│  ├─ match.ts                  # Core match type definition
│  └─ top-lists.ts              # Types for top‑list entities
├─ hooks/
│  ├─ use-top-lists.ts          # Fetches and caches top‑list data
│  ├─ use-toast.ts              # Toast notification hook
│  └─ use‑list‑store.ts          # Connects UI to list store
├─ lib/
│  ├─ api/
│  │  └─ top-lists.ts          # API client for top‑lists
│  └─ query-keys/
│     └─ top-lists.ts          # Query key definitions for React‑Query
└─ stores/
   ├─ session-store.ts         # Session data store
   └─ ...
```

### Relationships
- `SimpleMatchGrid` imports `SimpleDropZone`, `use-list-store`, and domain types from `types/match.ts`.
- The `Collection` module provides CRUD helpers that are used by `SimpleMatchGrid` to create/remove matches.
- `use-top-lists` relies on `lib/api/top-lists.ts` and `query-keys/top-lists.ts` for fetching data and caching it with React‑Query.
- Session handling (`session-store`, `session-manager`) is used by stores and API calls to attach authentication tokens.
- All stores expose a hook (`use-...`) that components consume, ensuring separation between state logic and UI.

## 4. Entry Points & Exports

- **src/app/features/Match/sub_MatchCollections/SimpleMatchGrid.tsx** is the public component that external modules import to render the match grid.
- **src/app/features/Collection/index.ts** re‑exports collection helpers for external consumption.
- **src/stores/** modules expose both raw store instances and React hooks for convenient use.
- **src/hooks/** provide higher‑level abstractions for async data and notifications.

---

**Key Takeaway**: This context bundles a drag‑and‑drop match grid UI with a robust, type‑safe state layer, session persistence, and a clean separation of concerns, making it straightforward for developers to integrate and extend match‑management functionality in the application.",
  "fileStructure": "tree -L 3 src | sed 's/^/  /'"
}
**Related Files**:
- `src/app/features/Match/sub_MatchCollections/SimpleMatchGrid.tsx`
- `src/app/features/Collection/index.ts`
- `src/app/features/Collection/types.ts`
- `src/app/features/Match/sub_MatchCollections/SimpleDropZone.tsx`
- `src/stores/backlog-store.ts`
- `src/stores/grid-store.ts`
- `src/stores/use-list-store.ts`
- `src/types/backlog-groups.ts`
- `src/types/match.ts`
- `src/hooks/use-top-lists.ts`
- `src/stores/session-store.ts`
- `src/types/top-lists.ts`
- `src/hooks/use-toast.ts`
- `src/lib/api/top-lists.ts`
- `src/lib/query-keys/top-lists.ts`
- `src/stores/backlog/index.ts`
- `src/stores/item-store/session-manager.ts`
- `src/stores/item-store/types.ts`

**Post-Implementation**: After completing this requirement, evaluate if the context description or file paths need updates. Use the appropriate API/DB query to update the context if architectural changes were made.

## Recommended Skills

- **compact-ui-design**: Use `.claude/skills/compact-ui-design.md` for high-quality UI design references and patterns. Any ideas for further UI/UX improvements are welcomed.

## Notes

This requirement was created to fulfill a goal: **Backlog group redesign**

**Goal Description**: We need to redesign Backlog sidebar with groups so
- One Backlog group = 1 row
- Backlog group rows are sorted asc by name from top to bottom