# Higher-Order Components (HOCs)

This directory contains reusable higher-order components that add common functionality to React components.

## withHydrationSafe

A HOC that prevents hydration mismatches by ensuring components only render after the client has mounted.

### Usage

```tsx
import { withHydrationSafe } from "@/lib/hoc";

// Basic usage
function MyComponent() {
  return <div>Client-only content</div>;
}

export const SafeComponent = withHydrationSafe(MyComponent);
```

### With Custom Fallback

```tsx
import { withHydrationSafe } from "@/lib/hoc";

function UserMenu() {
  return <div>User menu content</div>;
}

// Show a skeleton while hydrating
export const SafeUserMenu = withHydrationSafe(
  UserMenu,
  <div className="skeleton h-10 w-10" />
);
```

### Benefits

- **Reduces Boilerplate**: Eliminates the need for manual `useHydrationSafe()` checks in every component
- **Prevents Hydration Bugs**: Automatically handles SSR/client rendering differences
- **Consistent Pattern**: Encourages uniform handling of hydration across the codebase
- **Type Safe**: Preserves component props types with TypeScript generics

### Before (Manual Hook)

```tsx
import { useHydrationSafe } from "@/lib/hooks/useHydrationSafe";

export function ThemeToggle() {
  const mounted = useHydrationSafe();

  if (!mounted) return null;

  return <div>Theme toggle content</div>;
}
```

### After (HOC)

```tsx
import { withHydrationSafe } from "@/lib/hoc";

function ThemeToggleBase() {
  return <div>Theme toggle content</div>;
}

export const ThemeToggle = withHydrationSafe(ThemeToggleBase);
```

## When to Use

Use `withHydrationSafe` when your component:

- Uses browser-only APIs (localStorage, window, etc.)
- Depends on client-side state (theme, user preferences)
- May render differently on server vs. client
- Uses third-party libraries that expect a browser environment

## See Also

- [useHydrationSafe Hook](../hooks/useHydrationSafe.ts) - The underlying hook used by this HOC
- [Theme Toggle](../../components/theme/theme-toggle.tsx) - Example implementation
