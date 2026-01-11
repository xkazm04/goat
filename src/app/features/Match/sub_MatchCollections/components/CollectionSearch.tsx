"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Command } from "lucide-react";

interface CollectionSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
  totalCount?: number;
  placeholder?: string;
}

/**
 * Quick-search filter input for the collection panel.
 * Features:
 * - Instant filtering as user types
 * - Keyboard shortcut (/ or Cmd+F) to focus
 * - Clear button when search has value
 * - Result count feedback
 */
export function CollectionSearch({
  value,
  onChange,
  resultCount = 0,
  totalCount = 0,
  placeholder = "Search items...",
}: CollectionSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // "/" key to focus search (only if not already in an input)
      if (e.key === "/" && !isInputElement(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // Cmd/Ctrl + F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        // Only intercept if the collection panel is visible
        const panel = document.querySelector('[data-testid="collection-panel"]');
        if (panel) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }

      // Escape to clear and blur
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        if (value) {
          onChange("");
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, onChange]);

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  const isFiltering = value.length > 0;
  const hasResults = resultCount > 0;

  return (
    <div className="relative flex items-center gap-2" data-testid="collection-search-container">
      {/* Search Input Container */}
      <div
        className={`
          relative flex items-center gap-2 flex-1 min-w-[200px] max-w-[320px]
          bg-gray-800/60 dark:bg-gray-900/60
          rounded-lg border transition-all duration-200
          ${isFocused
            ? "border-cyan-500/50 ring-1 ring-cyan-500/20 bg-gray-800/80"
            : "border-white/10 hover:border-white/20"
          }
        `}
      >
        {/* Search Icon */}
        <div className="pl-3 flex items-center">
          <Search
            className={`w-4 h-4 transition-colors ${
              isFocused ? "text-cyan-400" : "text-gray-500"
            }`}
          />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="
            flex-1 py-2 pr-2 bg-transparent text-sm text-white
            placeholder:text-gray-500 dark:placeholder:text-gray-600
            focus:outline-none
          "
          aria-label="Search collection items"
          data-testid="collection-search-input"
        />

        {/* Clear Button / Keyboard Hint */}
        <AnimatePresence mode="wait">
          {isFiltering ? (
            <motion.button
              key="clear"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              className="pr-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Clear search"
              data-testid="collection-search-clear-btn"
            >
              <X className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pr-2 flex items-center gap-0.5"
            >
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-gray-500 bg-gray-700/50 rounded border border-gray-600/30">
                <span className="text-[9px]">/</span>
              </kbd>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result Count Badge */}
      <AnimatePresence>
        {isFiltering && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className={`
              text-xs font-mono px-2 py-1 rounded
              ${hasResults
                ? "text-cyan-400 bg-cyan-500/10"
                : "text-amber-400 bg-amber-500/10"
              }
            `}
            data-testid="collection-search-result-count"
          >
            {resultCount} / {totalCount}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Helper to check if event target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false;
  const tagName = (target as HTMLElement).tagName?.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
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
      return (
        <mark
          key={index}
          className="bg-cyan-500/30 text-cyan-200 rounded-sm px-0.5"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Filter items by search query
 * Matches against item title (case-insensitive)
 */
export function filterItemsByQuery<T extends { title: string }>(
  items: T[],
  query: string
): T[] {
  if (!query.trim()) return items;

  const normalizedQuery = query.toLowerCase().trim();
  return items.filter((item) =>
    item.title.toLowerCase().includes(normalizedQuery)
  );
}
