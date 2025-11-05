# Theme Components

This directory contains theme-related components for the application.

## Components

### ThemeProvider
Provider component that wraps the application to enable theme switching functionality using `next-themes`.

### ThemeToggle
A dropdown button component that allows users to switch between different themes (Light, Dark, and Neon Truth/Experimental Dark).

### ThemeAwareIcon
A reusable component that automatically displays the appropriate icon based on the current theme with smooth animations. Uses a single DOM element with CSS-driven transitions, eliminating absolute positioning and reducing rendering overhead.

## ThemeAwareIcon

The `ThemeAwareIcon` component centralizes icon selection and animation logic for theme-responsive UI elements.

### Features
- Automatically switches icons based on the current theme
- Single DOM element eliminates absolute positioning and layout shifts
- Smooth CSS-driven transitions with no hydration flicker
- Reduced rendering overhead with fewer DOM nodes
- Customizable icons and sizes
- TypeScript support with full type safety
- Follows existing design patterns

### Usage

```tsx
import { ThemeAwareIcon } from "@/components/theme/theme-aware-icon";

// Basic usage with default icons (Sun, Moon, Palette)
<ThemeAwareIcon />

// Custom size
<ThemeAwareIcon size="lg" />

// Custom icons
<ThemeAwareIcon
  icons={{
    light: <CustomLightIcon />,
    dark: <CustomDarkIcon />,
    experimentalDark: <CustomExperimentalIcon />
  }}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icons` | `ThemeIconConfig` | Sun, Moon, Palette | Custom icons for each theme |
| `className` | `string` | - | Additional CSS classes |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Icon size |

### Default Icons
- **Light theme**: Sun icon
- **Dark theme**: Moon icon
- **Experimental Dark theme**: Palette icon

### Animation
The component uses CSS transitions for smooth icon changes. Unlike the previous implementation with three overlapping icons using absolute positioning, this version renders only the active icon, dramatically reducing DOM complexity and eliminating potential hydration mismatches.

## Migration from IconButton Pattern

Before:
```tsx
<IconButton
  icons={[
    {
      icon: <Sun />,
      rotation: 'rotate-0',
      scale: 'scale-100',
      condition: 'dark:-rotate-90 dark:scale-0',
    },
    // ... more icon states
  ]}
  ariaLabel="Toggle theme"
/>
```

After:
```tsx
<Button>
  <ThemeAwareIcon />
  <span className="sr-only">Toggle theme</span>
</Button>
```

## File Structure

```
src/components/theme/
├── theme-provider.tsx     # Theme context provider
├── theme-toggle.tsx       # Theme switching button
├── theme-aware-icon.tsx   # Reusable theme-aware icon component
├── index.ts              # Barrel exports
└── README.md             # Documentation
```
