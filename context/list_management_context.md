# Feature Context: List Management System

## Core Functionality
Complete list creation and management system allowing users to create, select, and manage lists. Integrates with temporary user system for persistence and includes both predefined and user-created lists.

## Architecture

### Location Map

- CreateListSectionExample.tsx
- ListSelectionModal.tsx
- use-top-lists.ts
- use-temp-user.ts
- use-list-store.ts
- top-lists.ts
- composition-to-api.ts
- features/Landing/CreateListSectionExample.tsx
- features/Landing/ListSelectionModal.tsx
- stores/use-list-store.ts
- hooks/use-top-lists.ts

### Key Files by Layer

**Frontend Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `features/Landing/CreateListSectionExample.tsx` | List creation UI | Modifying creation flow |
| `features/Landing/ListSelectionModal.tsx` | List selection interface | Changing selection behavior |

**State Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `stores/use-list-store.ts` | List state management | Updating list logic |
| `hooks/use-top-lists.ts` | List data fetching | Modifying data retrieval |

## Data Flow
1. User initiates list creation/selection
2. Modal displays options
3. Selection triggers state update
4. Router handles navigation

## Business Rules
- Support both temporary and authenticated users
- Maintain predefined and user-created lists
- Handle list switching and state persistence

## Notes for LLM/Developer
Integration point between temporary user system and persistent storage.
```

These contexts represent the major functional areas of the application while ensuring:
- Each file belongs to exactly one context
- Features span multiple architectural layers
- Contexts represent complete user capabilities
- Documentation follows the required format

Let me know if you would like me to analyze any other aspects of the codebase or create additional contexts.