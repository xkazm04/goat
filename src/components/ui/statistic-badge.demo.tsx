/**
 * StatisticBadge Component Usage Examples
 *
 * This file demonstrates various ways to use the StatisticBadge component.
 * Copy and adapt these examples into your application code.
 */

import { StatisticBadge } from "./statistic-badge";

export function StatisticBadgeExamples() {
  return (
    <div className="space-y-8 p-8">
      {/* Basic Usage */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Basic Usage</h3>
        <div className="flex flex-wrap gap-4">
          <StatisticBadge label="Total Items" value={42} />
          <StatisticBadge
            label="Avg Rating"
            value="4.5★"
            valueColor="text-yellow-500"
          />
          <StatisticBadge
            label="Completed"
            value="85%"
            valueColor="text-green-400"
          />
        </div>
      </section>

      {/* Variants */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Color Variants</h3>
        <div className="flex flex-wrap gap-4">
          <StatisticBadge label="Default" value={100} variant="default" />
          <StatisticBadge label="Primary" value={100} variant="primary" />
          <StatisticBadge label="Success" value={100} variant="success" />
          <StatisticBadge label="Warning" value={100} variant="warning" />
          <StatisticBadge label="Danger" value={100} variant="danger" />
          <StatisticBadge label="Info" value={100} variant="info" />
        </div>
      </section>

      {/* Sizes */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Sizes</h3>
        <div className="flex flex-wrap items-center gap-4">
          <StatisticBadge label="Small" value={42} size="sm" />
          <StatisticBadge label="Medium" value={42} size="md" />
          <StatisticBadge label="Large" value={42} size="lg" />
        </div>
      </section>

      {/* With Tooltips */}
      <section>
        <h3 className="text-lg font-semibold mb-4">With Tooltips</h3>
        <div className="flex flex-wrap gap-4">
          <StatisticBadge
            label="Items"
            value={150}
            tooltip="Total number of items in your collection"
          />
          <StatisticBadge
            label="Score"
            value="A+"
            tooltip="Your current performance rating"
            variant="success"
          />
          <StatisticBadge
            label="Views"
            value="1.2K"
            tooltip="Total views this month"
            tooltipSide="bottom"
          />
        </div>
      </section>

      {/* With Icons */}
      <section>
        <h3 className="text-lg font-semibold mb-4">With Icons</h3>
        <div className="flex flex-wrap gap-4">
          <StatisticBadge
            label="Users"
            value={2500}
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            }
          />
          <StatisticBadge
            label="Revenue"
            value="$45K"
            icon={
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            variant="success"
          />
        </div>
      </section>

      {/* Clickable Badges */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Clickable Badges</h3>
        <div className="flex flex-wrap gap-4">
          <StatisticBadge
            label="Click Me"
            value={42}
            clickable
            onClick={() => alert("Badge clicked!")}
          />
          <StatisticBadge
            label="Interactive"
            value="100%"
            clickable
            onClick={() => console.log("Badge interaction")}
            variant="primary"
          />
        </div>
      </section>

      {/* In CollectionStats Context */}
      <section>
        <h3 className="text-lg font-semibold mb-4">
          Use in CollectionStats/Match Headers
        </h3>
        <div className="flex flex-wrap gap-4">
          <StatisticBadge
            label="Avg Ranking"
            value="4.2★"
            valueColor="text-yellow-500"
            tooltip="Average ranking across all items"
            variant="default"
            size="sm"
          />
          <StatisticBadge
            label="Rated Items"
            value={12}
            valueColor="text-yellow-400"
            tooltip="Number of items with ratings"
            variant="default"
            size="sm"
          />
          <StatisticBadge
            label="Top Rated"
            value="Movie A"
            valueColor="text-cyan-400"
            tooltip="Highest ranked item"
            variant="primary"
            size="sm"
          />
        </div>
      </section>
    </div>
  );
}
