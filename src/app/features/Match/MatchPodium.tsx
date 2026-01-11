"use client";

import { MatchGridSlot } from "./MatchGridSlot";
import { useGridPresenter } from "./hooks/useGridPresenter";

interface MatchGridPodiumProps {
  maxItems: number;
}

/**
 * MatchGridPodium - Main grid display component for the Match feature
 * Renders drop zones for grid positions with podium-style layout.
 * Uses useGridPresenter hook for memoized, pre-computed rendering data.
 */
export function MatchGridPodium({ maxItems }: MatchGridPodiumProps) {
  const { sections, podiumSlots } = useGridPresenter(maxItems);

  // Find podium section for special top-3 layout
  const podiumSection = sections.find((s) => s.type === "podium");
  const otherSections = sections.filter((s) => s.type !== "podium");

  return (
    <div className="w-full p-6 space-y-6" data-testid="match-grid-podium">
      {/* Top 3 Podium - Special layout with 2nd, 1st, 3rd arrangement */}
      {podiumSection && podiumSection.isVisible && podiumSlots.length >= 3 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">
            {podiumSection.title}
          </h3>
          <div className="flex justify-center gap-6">
            {/* 2nd Place (Left) */}
            <MatchGridSlot
              position={1}
              gridItem={podiumSlots[1].gridItem}
              size="medium"
            />

            {/* 1st Place (Center, Larger) */}
            <MatchGridSlot
              position={0}
              gridItem={podiumSlots[0].gridItem}
              size="large"
            />

            {/* 3rd Place (Right) */}
            <MatchGridSlot
              position={2}
              gridItem={podiumSlots[2].gridItem}
              size="medium"
            />
          </div>
        </div>
      )}

      {/* Render other sections dynamically */}
      {otherSections.map((section, sectionIndex) => {
        if (!section.isVisible || section.slots.length === 0) return null;

        const isRemainingSection = section.type === "remaining";
        const gridColsClass = isRemainingSection
          ? "grid-cols-10"
          : "grid-cols-7";

        return (
          <div key={`section-${sectionIndex}`} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              {section.title}
            </h3>
            <div className={`grid ${gridColsClass} gap-3`}>
              {section.slots.map((slot) => (
                <MatchGridSlot
                  key={slot.position}
                  position={slot.position}
                  gridItem={slot.gridItem}
                  size={slot.size}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
