# Feature Context: Match System

## Core Functionality
Interactive match creation and management system with drag-and-drop functionality, position-based item assignment, and real-time validation. Provides users with a dynamic interface for organizing and managing match-related content. Includes mobile-optimized swipe gesture detection for TikTok-style ranking interactions.

## Architecture

### Location Map

- MatchDroppable.tsx
- MatchEmptySlot.tsx
- MatchContainer.tsx
- item-store.ts
- backlog-store.ts
- use-temp-user.ts
- app/match/MatchDroppable.tsx
- app/match/MatchEmptySlot.tsx
- stores/item-store.ts
- stores/backlog-store.ts

### Key Files by Layer

**Frontend Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `app/match/MatchDroppable.tsx` | Drag-and-drop target component | Changing drop behavior |
| `app/match/MatchEmptySlot.tsx` | Empty position placeholder | Modifying slot appearance |
| `app/features/matching/components/SwipeableCard.tsx` | Mobile swipe gesture wrapper | Changing swipe behavior or animations |

**State Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `stores/item-store.ts` | Item state management | Changing item logic |
| `stores/backlog-store.ts` | Backlog state management | Modifying backlog behavior |

**Gesture System Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `lib/gestures/useSwipeGesture.ts` | Touch event detection and swipe logic | Adjusting gesture thresholds or detection |
| `lib/gestures/types.ts` | Gesture type definitions | Adding new gesture types or events |

## Data Flow
1. User drags item from backlog
2. MatchDroppable validates position
3. Item-store updates assignment
4. UI reflects new state

## Business Rules
- Items can only be dropped in valid positions
- Position validation checks before assignment
- Real-time state updates across components

## Notes for LLM/Developer
Uses DND-kit for drag-and-drop functionality with Framer Motion for animations. Mobile swipe gesture engine provides touch-based interactions with configurable thresholds (50px min distance, 500ms max duration, 0.3 min velocity) and includes particle burst effects, spring physics animations, and edge case handling for accidental touches and multi-touch scenarios.