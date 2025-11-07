# StatsCard Component

## Overview

The **StatsCard** is a flexible, reusable component for displaying statistics and metrics in a visually consistent manner. It supports multiple layouts (inline, stacked, grid, spread), dark mode styling, loading skeletons, icons, and custom colors.

## Features

- **Multiple Layouts**: inline, stacked, grid, spread
- **Dark Mode Friendly**: Optimized colors for dark backgrounds
- **Loading States**: Built-in skeleton loader
- **Flexible Metrics**: Supports labels, values, icons, colors, subtitles, and change indicators
- **Type-Safe**: Full TypeScript support
- **Accessible**: Includes data-testid attributes for testing
- **Customizable**: Extensive styling options via props and className

## Installation

```tsx
import { StatsCard, Metric } from "@/components/ui";
```

## Basic Usage

### Inline Layout (Default)

```tsx
<StatsCard
  metrics={[
    { label: "Total", value: 100 },
    { label: "Active", value: 42, color: "text-cyan-400" },
    { label: "Completed", value: 58, color: "text-green-400" }
  ]}
/>
```

### Grid Layout

```tsx
<StatsCard
  metrics={[
    { label: "Users", value: "1.2K", icon: <UserIcon /> },
    { label: "Revenue", value: "$45K", icon: <DollarIcon />, change: "+12%", changeType: "positive" },
    { label: "Orders", value: 342, icon: <ShoppingIcon />, subtitle: "Last 30 days" }
  ]}
  layout="grid"
  gridCols={3}
/>
```

### Stacked Layout

```tsx
<StatsCard
  metrics={[
    { label: "Total Items", value: 150, subtitle: "All time" },
    { label: "This Month", value: 23, color: "text-cyan-400" },
    { label: "This Week", value: 8, color: "text-yellow-400" }
  ]}
  layout="stacked"
/>
```

### Spread Layout

```tsx
<StatsCard
  metrics={[
    { label: "Start", value: 100 },
    { label: "Middle", value: 250 },
    { label: "End", value: 500 }
  ]}
  layout="spread"
/>
```

## Props

### StatsCardProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `metrics` | `Metric[]` | **required** | Array of metric objects to display |
| `layout` | `"inline" \| "stacked" \| "grid" \| "spread"` | `"inline"` | Display layout |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | Text size |
| `loading` | `boolean` | `false` | Show loading skeleton |
| `skeletonCount` | `number` | `3` | Number of skeleton items when loading |
| `gridCols` | `2 \| 3 \| 4 \| 5 \| 6` | `3` | Grid columns (grid layout only) |
| `darkMode` | `boolean` | `true` | Enable dark mode styling |
| `showDividers` | `boolean` | `false` | Show dividers between metrics (inline only) |
| `className` | `string` | - | Custom container class |
| `itemClassName` | `string` | - | Custom class for individual items |
| `testId` | `string` | `"stats-card"` | Test ID attribute |
| `onMetricClick` | `(metric: Metric) => void` | - | Callback when metric is clicked |

### Metric Interface

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | No | Unique identifier |
| `label` | `string` | **Yes** | Metric label/name |
| `value` | `string \| number` | **Yes** | Metric value |
| `icon` | `React.ReactNode` | No | Icon element |
| `color` | `string` | No | Custom Tailwind color class |
| `subtitle` | `string` | No | Additional description |
| `emphasis` | `"default" \| "primary" \| "secondary"` | No | Emphasis level |
| `change` | `string` | No | Change indicator (e.g., "+5%") |
| `changeType` | `"positive" \| "negative" \| "neutral"` | No | Change type for coloring |

## Default Colors

The component includes default color mappings based on label names:

- **Total**: `text-gray-300`
- **Selected**: `text-cyan-400`
- **Active**: `text-green-400`
- **Pending**: `text-yellow-400`
- **Completed**: `text-blue-400`
- **Error**: `text-red-400`
- **Warning**: `text-orange-400`

You can override these by providing a custom `color` prop.

## Advanced Examples

### With Icons and Change Indicators

```tsx
import { TrendingUpIcon, UsersIcon, DollarSignIcon } from "lucide-react";

<StatsCard
  metrics={[
    {
      label: "Revenue",
      value: "$124.5K",
      icon: <DollarSignIcon className="w-4 h-4" />,
      change: "+15.3%",
      changeType: "positive",
      subtitle: "vs last month"
    },
    {
      label: "Users",
      value: "8,234",
      icon: <UsersIcon className="w-4 h-4" />,
      change: "+234",
      changeType: "positive"
    },
    {
      label: "Growth",
      value: "23%",
      icon: <TrendingUpIcon className="w-4 h-4" />,
      change: "-2%",
      changeType: "negative",
      color: "text-orange-400"
    }
  ]}
  layout="grid"
  gridCols={3}
/>
```

### Loading State

```tsx
<StatsCard
  metrics={[]}
  loading={true}
  skeletonCount={4}
  layout="grid"
/>
```

### Interactive Stats (Clickable)

```tsx
<StatsCard
  metrics={[
    { label: "Total", value: 100 },
    { label: "Active", value: 42 }
  ]}
  onMetricClick={(metric) => {
    console.log("Clicked metric:", metric.label);
    // Navigate to detail view, show modal, etc.
  }}
/>
```

### Custom Styling

```tsx
<StatsCard
  metrics={metrics}
  className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl"
  itemClassName="hover:scale-105 transition-transform"
/>
```

## Integration with Existing Components

### Example: Collection Feature

```tsx
// Before (old CollectionStats)
<div className="flex items-center gap-4 text-xs">
  <div className="flex items-center gap-1">
    <span className="text-gray-500">Total:</span>
    <span className="text-gray-300 font-semibold">{stats.totalItems}</span>
  </div>
  {/* ... */}
</div>

// After (using StatsCard)
<StatsCard
  metrics={[
    { label: "Total", value: stats.totalItems },
    { label: "Selected", value: stats.selectedItems, color: "text-cyan-400" }
  ]}
/>
```

## Accessibility

- Uses semantic HTML
- Includes `data-testid` attributes on all interactive elements
- Supports keyboard navigation when `onMetricClick` is provided
- Screen reader friendly labels and values

## Testing

```tsx
import { render, screen } from "@testing-library/react";
import { StatsCard } from "@/components/ui";

test("renders metrics correctly", () => {
  render(
    <StatsCard
      metrics={[
        { label: "Total", value: 100 },
        { label: "Active", value: 42 }
      ]}
    />
  );

  expect(screen.getByTestId("stats-card")).toBeInTheDocument();
  expect(screen.getByTestId("stat-item-total")).toBeInTheDocument();
  expect(screen.getByText("100")).toBeInTheDocument();
});
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires Tailwind CSS and class-variance-authority

## Related Components

- **Skeleton**: Used for loading states
- **ItemCard**: Similar composable card component
- **Button**: For interactive controls

## License

Part of the GOAT project UI component library.
