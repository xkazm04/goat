"use client";

import { memo, useEffect, useRef, useState } from "react";

import { useTierFocus } from "./TierFocusProvider";

/**
 * ScreenReaderAnnouncer - Live region for screen reader announcements
 *
 * Uses aria-live regions to announce actions and state changes to screen readers.
 * Supports both polite (waits for idle) and assertive (interrupts) announcements.
 *
 * WCAG 2.1 Compliance:
 * - Uses aria-live for dynamic content updates
 * - Uses aria-atomic to ensure full announcement
 * - Clears announcements after a delay to prevent re-reading
 */
export const ScreenReaderAnnouncer = memo(function ScreenReaderAnnouncer() {
  const { announcements, clearAnnouncements } = useTierFocus();
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (announcements.length === 0) return;

    // Get the most recent announcement
    const latest = announcements[announcements.length - 1];

    // Set the appropriate live region
    if (latest.priority === "assertive") {
      setAssertiveMessage(latest.message);
      setPoliteMessage("");
    } else {
      setPoliteMessage(latest.message);
      setAssertiveMessage("");
    }

    // Clear the message after a delay to prevent re-reading
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }

    clearTimeoutRef.current = setTimeout(() => {
      setPoliteMessage("");
      setAssertiveMessage("");
      clearAnnouncements();
    }, 1000);

    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, [announcements, clearAnnouncements]);

  return (
    <>
      {/* Polite live region - waits for idle */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="sr-announcer-polite"
      >
        {politeMessage}
      </div>

      {/* Assertive live region - interrupts immediately */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="sr-announcer-assertive"
      >
        {assertiveMessage}
      </div>
    </>
  );
});

/**
 * Standalone announcer for use outside TierFocusProvider
 */
interface StandaloneAnnouncerProps {
  message: string;
  priority?: "polite" | "assertive";
  clearAfter?: number;
}

export const StandaloneAnnouncer = memo(function StandaloneAnnouncer({
  message,
  priority = "polite",
  clearAfter = 1000,
}: StandaloneAnnouncerProps) {
  const [currentMessage, setCurrentMessage] = useState(message);

  useEffect(() => {
    setCurrentMessage(message);

    const timeout = setTimeout(() => {
      setCurrentMessage("");
    }, clearAfter);

    return () => clearTimeout(timeout);
  }, [message, clearAfter]);

  if (priority === "assertive") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {currentMessage}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
});

/**
 * SkipLinks - Accessible skip navigation for tier list
 *
 * Allows keyboard users to quickly jump to main sections.
 * Visible only on focus for screen reader users.
 */
interface SkipLinksProps {
  tiers: { id: string; label: string }[];
  onSkipToTier: (tierId: string) => void;
  onSkipToUnranked: () => void;
}

export const SkipLinks = memo(function SkipLinks({
  tiers,
  onSkipToTier,
  onSkipToUnranked,
}: SkipLinksProps) {
  return (
    <nav
      aria-label="Skip links"
      className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-2 focus-within:left-2 focus-within:z-modal"
    >
      <ul className="flex flex-col gap-1 bg-slate-900 border border-slate-700 rounded-card p-2 shadow-xl">
        <li>
          <button
            onClick={() => onSkipToTier(tiers[0]?.id)}
            className="block w-full px-3 py-1.5 text-sm text-left text-white hover:bg-slate-700 rounded focus:outline-hidden focus:ring-2 focus:ring-brand"
          >
            Skip to tier list
          </button>
        </li>
        {tiers.slice(0, 6).map((tier) => (
          <li key={tier.id}>
            <button
              onClick={() => onSkipToTier(tier.id)}
              className="block w-full px-3 py-1.5 text-sm text-left text-slate-300 hover:bg-slate-700 rounded focus:outline-hidden focus:ring-2 focus:ring-brand"
            >
              Skip to {tier.label} tier
            </button>
          </li>
        ))}
        <li>
          <button
            onClick={onSkipToUnranked}
            className="block w-full px-3 py-1.5 text-sm text-left text-slate-300 hover:bg-slate-700 rounded focus:outline-hidden focus:ring-2 focus:ring-brand"
          >
            Skip to unranked pool
          </button>
        </li>
      </ul>
    </nav>
  );
});

/**
 * TierInstructions - Hidden instructions for screen reader users
 */
export const TierInstructions = memo(function TierInstructions() {
  return (
    <div id="tier-list-instructions" className="sr-only">
      <p>
        Tier list ranking. Use arrow keys to navigate between tiers and items.
        Press number keys 1 through 9 to quickly assign the focused item to a tier.
        Press Shift plus arrow keys to move items between tiers.
        Press Delete or U to move an item to the unranked pool.
        Press K to toggle keyboard navigation mode.
        Press question mark for a full list of keyboard shortcuts.
      </p>
    </div>
  );
});

/**
 * FocusIndicator - Visual focus ring for WCAG compliance
 *
 * Provides a visible focus indicator with 4.5:1 contrast ratio
 */
interface FocusIndicatorProps {
  isFocused: boolean;
  variant?: "item" | "tier" | "button";
  className?: string;
}

export const FocusIndicator = memo(function FocusIndicator({
  isFocused,
  variant = "item",
  className = "",
}: FocusIndicatorProps) {
  if (!isFocused) return null;

  const ringStyles = {
    item: "ring-2 ring-brand-hover ring-offset-2 ring-offset-slate-900",
    tier: "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900",
    button: "ring-2 ring-white ring-offset-2 ring-offset-slate-900",
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none rounded-card ${ringStyles[variant]} ${className}`}
      style={{
        boxShadow: variant === "item"
          ? "0 0 0 2px #22d3ee, 0 0 12px rgba(34, 211, 238, 0.5)"
          : variant === "tier"
            ? "0 0 0 2px #fbbf24, 0 0 12px rgba(251, 191, 36, 0.5)"
            : "0 0 0 2px #ffffff",
      }}
      aria-hidden="true"
      data-testid="focus-indicator"
    />
  );
});

export type { StandaloneAnnouncerProps, SkipLinksProps, FocusIndicatorProps };
