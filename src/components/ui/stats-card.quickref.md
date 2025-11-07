# StatsCard Quick Reference

## Import
```tsx
import { StatsCard, Metric } from "@/components/ui";
```

## Basic Usage
```tsx
<StatsCard
  metrics={[
    { label: "Total", value: 100 },
    { label: "Active", value: 42, color: "text-cyan-400" }
  ]}
/>
```

## Common Props

| Prop | Type | Example |
|------|------|---------|
| `metrics` | `Metric[]` | `[{ label: "Total", value: 100 }]` |
| `layout` | `"inline" \| "stacked" \| "grid" \| "spread"` | `"grid"` |
| `loading` | `boolean` | `true` |
| `gridCols` | `2 \| 3 \| 4 \| 5 \| 6` | `3` |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` |
| `showDividers` | `boolean` | `true` |

## Metric Properties

| Property | Type | Example |
|----------|------|---------|
| `label` | `string` | `"Total Users"` |
| `value` | `string \| number` | `"1,234"` or `1234` |
| `icon` | `ReactNode` | `<Users className="w-4 h-4" />` |
| `color` | `string` | `"text-cyan-400"` |
| `change` | `string` | `"+12%"` |
| `changeType` | `"positive" \| "negative" \| "neutral"` | `"positive"` |
| `subtitle` | `string` | `"Last 30 days"` |

## Layout Examples

### Inline (Default)
```tsx
<StatsCard metrics={metrics} layout="inline" />
```
Horizontal, compact - for headers

### Grid
```tsx
<StatsCard metrics={metrics} layout="grid" gridCols={3} />
```
Responsive grid - for dashboards

### Stacked
```tsx
<StatsCard metrics={metrics} layout="stacked" />
```
Vertical - for sidebars

### Spread
```tsx
<StatsCard metrics={metrics} layout="spread" />
```
Evenly distributed - for progress bars

## With Icons
```tsx
import { Users, DollarSign } from "lucide-react";

<StatsCard
  metrics={[
    {
      label: "Users",
      value: "1.2K",
      icon: <Users className="w-4 h-4" />
    }
  ]}
/>
```

## With Change Indicators
```tsx
<StatsCard
  metrics={[
    {
      label: "Revenue",
      value: "$45K",
      change: "+12%",
      changeType: "positive"
    }
  ]}
/>
```

## Loading State
```tsx
<StatsCard
  metrics={[]}
  loading={true}
  skeletonCount={3}
/>
```

## Interactive (Clickable)
```tsx
<StatsCard
  metrics={metrics}
  onMetricClick={(metric) => {
    console.log("Clicked:", metric.label);
  }}
/>
```

## Custom Styling
```tsx
<StatsCard
  metrics={metrics}
  className="p-4 bg-gray-800 rounded-lg"
  itemClassName="hover:scale-105"
/>
```

## Default Colors

| Label | Color |
|-------|-------|
| Total | gray-300 |
| Selected | cyan-400 |
| Active | green-400 |
| Pending | yellow-400 |
| Completed | blue-400 |
| Error | red-400 |
| Warning | orange-400 |

## Real-World Example
```tsx
import { StatsCard } from "@/components/ui";
import { Users, TrendingUp } from "lucide-react";

function DashboardStats() {
  return (
    <StatsCard
      metrics={[
        {
          label: "Total Users",
          value: "8,234",
          icon: <Users className="w-5 h-5" />,
          change: "+234",
          changeType: "positive",
          subtitle: "Active this month"
        },
        {
          label: "Growth Rate",
          value: "23%",
          icon: <TrendingUp className="w-5 h-5" />,
          change: "+5%",
          changeType: "positive",
          color: "text-green-400"
        }
      ]}
      layout="grid"
      gridCols={2}
      size="md"
    />
  );
}
```

## Test IDs
- Container: `data-testid="stats-card"`
- Items: `data-testid="stat-item-{id}"`
- Label: `data-testid="stat-item-label"`
- Value: `data-testid="stat-item-value"`
- Icon: `data-testid="stat-item-icon"`
- Change: `data-testid="stat-item-change"`
