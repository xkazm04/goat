"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { useEnrichmentSources } from "@/stores/backlog/selectors";

/**
 * EnrichmentSourceBadges
 *
 * Displays animated source attribution pills during backlog loading.
 * Each pill transitions: pending (dim) → active (shimmer + cyan glow) → done (solid brand).
 * Uses the glass-dock-badge design tokens.
 */
export const EnrichmentSourceBadges = memo(function EnrichmentSourceBadges() {
  const { active, sources } = useEnrichmentSources();

  if (!active && sources.every(s => s.status === 'pending')) return null;
  if (sources.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {sources.map((source) => (
        <span
          key={source.id}
          className={cn(
            "glass-dock-badge inline-flex items-center gap-1 transition-all duration-300",
            source.status === 'pending' && "opacity-40 text-white/30",
            source.status === 'active' && "glass-dock-badge-active animate-ambient-shimmer enrichment-badge-glow",
            source.status === 'done' && "opacity-80 text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20"
          )}
        >
          {source.status === 'active' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          )}
          {source.status === 'done' && (
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
              <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <span className="text-2xs font-semibold tracking-wider uppercase">
            {source.label}
          </span>
        </span>
      ))}
    </div>
  );
});
