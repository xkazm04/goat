/**
 * Collection Search Utilities
 *
 * Shared search helpers extracted from CollectionSearch component
 * for use across collection-related search UIs.
 */

import React from "react";

/**
 * Escape special regex characters in a string
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Highlight matching text in a string
 * Returns JSX with matched portions wrapped in <mark> tags
 */
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return React.createElement(
        "mark",
        {
          key: index,
          className: "bg-brand/30 text-brand-hover rounded-sm px-0.5",
        },
        part
      );
    }
    return part;
  });
}


/**
 * Helper to check if event target is an input element
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  const tagName = el.tagName?.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    el.isContentEditable
  );
}
