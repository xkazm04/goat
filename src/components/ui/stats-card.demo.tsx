"use client";

/**
 * StatsCard Demo & Usage Examples
 *
 * This file demonstrates various use cases for the StatsCard component.
 * Import and use these examples in your storybook, documentation, or test pages.
 */

import { StatsCard, Metric } from "./stats-card";
import { Users, TrendingUp, DollarSign, ShoppingCart, Activity, Star } from "lucide-react";

/**
 * Example 1: Basic Inline Stats
 * Perfect for compact displays like collection headers
 */
export function InlineStatsExample() {
  const metrics: Metric[] = [
    { label: "Total", value: 150 },
    { label: "Selected", value: 42, color: "text-cyan-400" },
    { label: "Active", value: 38, color: "text-green-400" }
  ];

  return <StatsCard metrics={metrics} layout="inline" />;
}

/**
 * Example 2: Grid Dashboard Stats
 * Ideal for dashboard overview sections
 */
export function GridDashboardExample() {
  const metrics: Metric[] = [
    {
      label: "Users",
      value: "1,234",
      icon: <Users className="w-4 h-4" />,
      change: "+12.5%",
      changeType: "positive",
      subtitle: "Active users"
    },
    {
      label: "Revenue",
      value: "$45.2K",
      icon: <DollarSign className="w-4 h-4" />,
      change: "+8.2%",
      changeType: "positive",
      subtitle: "This month",
      color: "text-green-400"
    },
    {
      label: "Orders",
      value: 342,
      icon: <ShoppingCart className="w-4 h-4" />,
      change: "-3.1%",
      changeType: "negative",
      subtitle: "Last 30 days"
    },
    {
      label: "Rating",
      value: 4.8,
      icon: <Star className="w-4 h-4" />,
      change: "+0.2",
      changeType: "positive",
      subtitle: "Average rating",
      color: "text-yellow-400"
    }
  ];

  return <StatsCard metrics={metrics} layout="grid" gridCols={4} />;
}

/**
 * Example 3: Stacked Stats Card
 * Great for sidebar widgets or compact summaries
 */
export function StackedStatsExample() {
  const metrics: Metric[] = [
    {
      label: "Total Items",
      value: 1250,
      subtitle: "All time",
      emphasis: "primary"
    },
    {
      label: "This Month",
      value: 156,
      color: "text-cyan-400",
      change: "+23",
      changeType: "positive"
    },
    {
      label: "This Week",
      value: 42,
      color: "text-yellow-400",
      change: "+8",
      changeType: "positive"
    },
    {
      label: "Today",
      value: 7,
      color: "text-green-400"
    }
  ];

  return <StatsCard metrics={metrics} layout="stacked" />;
}

/**
 * Example 4: Loading State
 * Shows skeleton loader while data is fetching
 */
export function LoadingStatsExample() {
  return (
    <StatsCard
      metrics={[]}
      loading={true}
      skeletonCount={3}
      layout="inline"
    />
  );
}

/**
 * Example 5: Interactive Stats (Clickable)
 * Stats that respond to clicks for drill-down functionality
 */
export function InteractiveStatsExample() {
  const metrics: Metric[] = [
    { label: "Pending", value: 23, color: "text-yellow-400" },
    { label: "In Progress", value: 15, color: "text-blue-400" },
    { label: "Completed", value: 142, color: "text-green-400" }
  ];

  const handleMetricClick = (metric: Metric) => {
    console.log("Clicked:", metric.label);
    // Navigate to filtered view, show modal, etc.
  };

  return (
    <StatsCard
      metrics={metrics}
      onMetricClick={handleMetricClick}
      showDividers={true}
    />
  );
}

/**
 * Example 6: Spread Layout
 * Evenly distributed stats across container width
 */
export function SpreadStatsExample() {
  const metrics: Metric[] = [
    { label: "Start", value: 100, color: "text-cyan-400" },
    { label: "Progress", value: 250, color: "text-yellow-400" },
    { label: "Goal", value: 500, color: "text-green-400" }
  ];

  return <StatsCard metrics={metrics} layout="spread" />;
}

/**
 * Example 7: Custom Styled Stats
 * Demonstrates custom styling options
 */
export function CustomStyledStatsExample() {
  const metrics: Metric[] = [
    {
      label: "Performance",
      value: "98.5%",
      icon: <Activity className="w-5 h-5" />,
      color: "text-green-400",
      emphasis: "primary"
    },
    {
      label: "Uptime",
      value: "99.9%",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-cyan-400",
      emphasis: "primary"
    }
  ];

  return (
    <StatsCard
      metrics={metrics}
      layout="grid"
      gridCols={2}
      className="p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-2 border-purple-500/30 rounded-xl shadow-lg shadow-purple-500/10"
      itemClassName="hover:scale-105 transition-transform duration-200"
    />
  );
}

/**
 * Example 8: Collection Feature Integration
 * Real-world usage in the Collection feature
 */
export function CollectionStatsExample() {
  const metrics: Metric[] = [
    {
      id: "total-items",
      label: "Total",
      value: 245,
      color: "text-gray-300"
    },
    {
      id: "selected-items",
      label: "Selected",
      value: 87,
      color: "text-cyan-400"
    },
    {
      id: "visible-groups",
      label: "Groups",
      value: "12/18",
      color: "text-gray-300"
    }
  ];

  return (
    <StatsCard
      metrics={metrics}
      layout="inline"
      size="sm"
      testId="collection-stats-demo"
    />
  );
}

/**
 * Example 9: Large Stats Display
 * For prominent metrics that need attention
 */
export function LargeStatsExample() {
  const metrics: Metric[] = [
    {
      label: "Total Revenue",
      value: "$1.2M",
      icon: <DollarSign className="w-6 h-6" />,
      change: "+25%",
      changeType: "positive",
      subtitle: "Year to date",
      color: "text-green-400",
      emphasis: "primary"
    },
    {
      label: "New Customers",
      value: "8,456",
      icon: <Users className="w-6 h-6" />,
      change: "+1,234",
      changeType: "positive",
      subtitle: "This quarter",
      color: "text-cyan-400",
      emphasis: "primary"
    }
  ];

  return (
    <StatsCard
      metrics={metrics}
      layout="grid"
      gridCols={2}
      size="lg"
      className="p-8"
    />
  );
}

/**
 * All Examples Component
 * Showcases all variations in one page
 */
export function AllStatsCardExamples() {
  return (
    <div className="space-y-8 p-8 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-8">StatsCard Component Examples</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-300">1. Inline Layout</h2>
        <div className="p-4 bg-gray-800 rounded-lg">
          <InlineStatsExample />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-300">2. Grid Dashboard</h2>
        <div className="p-4 bg-gray-800 rounded-lg">
          <GridDashboardExample />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-300">3. Stacked Layout</h2>
        <div className="p-4 bg-gray-800 rounded-lg">
          <StackedStatsExample />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-300">4. Loading State</h2>
        <div className="p-4 bg-gray-800 rounded-lg">
          <LoadingStatsExample />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-300">5. Interactive Stats</h2>
        <div className="p-4 bg-gray-800 rounded-lg">
          <InteractiveStatsExample />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-300">6. Spread Layout</h2>
        <div className="p-4 bg-gray-800 rounded-lg">
          <SpreadStatsExample />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-300">7. Custom Styled</h2>
        <div className="p-4">
          <CustomStyledStatsExample />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-300">8. Collection Integration</h2>
        <div className="p-4 bg-gray-800 rounded-lg">
          <CollectionStatsExample />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-300">9. Large Stats Display</h2>
        <div className="p-4 bg-gray-800 rounded-lg">
          <LargeStatsExample />
        </div>
      </section>
    </div>
  );
}
