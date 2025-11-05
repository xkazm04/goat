# Feature Context: Hydration Safety Pattern

## Core Functionality
Provides a standardized approach for preventing hydration mismatches in client-side components through a reusable higher-order component (HOC) pattern.

## Architecture

### Location Map

- `src/lib/hooks/useHydrationSafe.ts` - Base hook for hydration safety
- `src/lib/hoc/withHydrationSafe.tsx` - Higher-order component wrapper
- `src/lib/hoc/index.ts` - HOC exports
- `src/lib/hoc/README.md` - Documentation and usage examples

### Key Files by Layer

**Hook Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `src/lib/hooks/useHydrationSafe.ts` | Detects client-side mounting | Changing hydration detection logic |

**HOC Layer:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `src/lib/hoc/withHydrationSafe.tsx` | Wraps components for hydration safety | Adding HOC features or configuration |
| `src/lib/hoc/index.ts` | Exports for easy importing | Adding new HOCs |

**Implementation Examples:**
| File | Purpose | Modify When |
| --- | --- | --- |
| `src/components/theme/theme-toggle.tsx` | Theme toggle using HOC pattern | Reference implementation |

## Data Flow

1. Component wrapped with `withHydrationSafe` HOC
2. On initial render (SSR), `useHydrationSafe` hook returns `false`
3. Component renders fallback (null or custom component)
4. After client-side mount, `useEffect` triggers and `mounted` becomes `true`
5. Component re-renders with actual content

```
Server Render → Fallback Component
    ↓
Client Mount → useEffect triggers
    ↓
State Update → mounted = true
    ↓
Re-render → Actual Component
```

## Business Rules

- Components must not render different content on server vs. client without hydration safety
- HOC preserves component display name for debugging
- Fallback should be null or a loading skeleton matching component dimensions
- Type safety maintained through TypeScript generics

## Implementation Details

### Basic Usage Pattern

**Before (Manual Hook):**
```tsx
import { useHydrationSafe } from "@/lib/hooks/useHydrationSafe";

export function MyComponent() {
  const mounted = useHydrationSafe();

  if (!mounted) return null;

  return <div>Content</div>;
}
```

**After (HOC Pattern):**
```tsx
import { withHydrationSafe } from "@/lib/hoc";

function MyComponentBase() {
  return <div>Content</div>;
}

export const MyComponent = withHydrationSafe(MyComponentBase);
```

### Advanced Usage with Fallback

```tsx
import { withHydrationSafe } from "@/lib/hoc";

function UserMenu() {
  return <div>User menu content</div>;
}

export const SafeUserMenu = withHydrationSafe(
  UserMenu,
  <div className="skeleton h-10 w-10" />
);
```

### Type Safety

```tsx
interface MyComponentProps {
  title: string;
  count: number;
}

function MyComponentBase({ title, count }: MyComponentProps) {
  return <div>{title}: {count}</div>;
}

// TypeScript preserves prop types
export const MyComponent = withHydrationSafe<MyComponentProps>(MyComponentBase);

// Usage still type-safe
<MyComponent title="Items" count={5} />
```

## When to Use

Use the HydrationSafe HOC when components:

1. **Access Browser APIs**: `window`, `localStorage`, `document`, etc.
2. **Depend on Client State**: Theme preferences, user settings
3. **Use Third-Party Libraries**: Libraries expecting browser environment
4. **Dynamic Content**: Content that differs between server and client

### Examples

- Theme toggles (uses `next-themes` with browser state)
- User authentication menus (client-side auth state)
- Geolocation features (browser-only API)
- localStorage-dependent features

## Benefits

1. **Reduces Boilerplate**: Eliminates repetitive hydration checks
2. **Prevents Bugs**: Consistent pattern reduces hydration mismatch errors
3. **Type Safe**: Full TypeScript support with generics
4. **Debuggable**: Preserves component names in dev tools
5. **Flexible**: Optional fallback support for better UX
6. **Testable**: Easier to test components without hydration concerns

## Migration Guide

To migrate existing components using manual `useHydrationSafe`:

1. Remove the `useHydrationSafe` import
2. Remove the `mounted` check and early return
3. Rename component to `ComponentNameBase`
4. Import `withHydrationSafe` from `@/lib/hoc`
5. Export wrapped component: `export const ComponentName = withHydrationSafe(ComponentNameBase)`

## Current Implementations

- **ThemeToggle** (`src/components/theme/theme-toggle.tsx`):23-63 - Theme switching component using HOC pattern

## Related Patterns

- **Server Components**: Prefer Server Components when client interactivity isn't needed
- **Dynamic Imports**: Use `next/dynamic` with `ssr: false` for heavy client-only components
- **useEffect Guard**: For small inline checks, `useEffect` guard may be simpler than HOC

## Performance Considerations

- HOC adds minimal overhead (one hook call)
- No extra re-renders beyond the initial hydration
- Fallback renders during SSR and hydration, then swaps to real component
- Consider skeleton loaders for better perceived performance

## Testing Strategy

```tsx
// Mock useHydrationSafe for tests
jest.mock('@/lib/hooks/useHydrationSafe', () => ({
  useHydrationSafe: () => true, // Always mounted in tests
}));

// Test the base component directly
import { ThemeToggleBase } from './theme-toggle';

test('renders theme options', () => {
  render(<ThemeToggleBase />);
  // ... assertions
});
```

## Future Enhancements

Potential improvements to the pattern:

1. **Timeout Support**: Optional timeout for hydration check
2. **Error Boundaries**: Built-in error handling for failed hydration
3. **Loading States**: Standardized loading skeleton system
4. **Analytics**: Track hydration timing for performance monitoring
5. **Dev Mode Warnings**: Warn about unnecessary HOC usage in development
