"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, TrendingUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isInputElement } from "@/lib/utils/search";

// Local storage key for recent searches
const RECENT_SEARCHES_KEY = "goat-collection-recent-searches";
const MAX_RECENT_SEARCHES = 5;

interface CollectionSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /**
   * "basic" — keyboard shortcuts + result count badge
   * "enhanced" — recent searches dropdown + item suggestions
   */
  variant?: "basic" | "enhanced";
  /** Result count (basic variant) */
  resultCount?: number;
  /** Total count (basic variant) */
  totalCount?: number;
  /** Searchable items for suggestions (enhanced variant) */
  items?: Array<{ id: string; title: string }>;
}

/**
 * Unified collection search input.
 *
 * - **basic**: Simple search with `/` and `Cmd+F` keyboard shortcuts and result count badge.
 * - **enhanced**: Search with recent-searches dropdown and item title suggestions.
 *
 * Both variants support `/` shortcut to focus and `Escape` to clear/blur.
 */
export function CollectionSearchInput({
  value,
  onChange,
  placeholder = "Search items...",
  variant = "enhanced",
  resultCount = 0,
  totalCount = 0,
  items = [],
}: CollectionSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // ── Recent searches (enhanced variant) ──────────────────────────────────
  useEffect(() => {
    if (variant !== "enhanced") return;
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {
      // Ignore
    }
  }, [variant]);

  const saveRecentSearch = useCallback(
    (query: string) => {
      if (variant !== "enhanced" || !query.trim()) return;
      setRecentSearches((prev) => {
        const filtered = prev.filter(
          (s) => s.toLowerCase() !== query.toLowerCase()
        );
        const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
        try {
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
    },
    [variant]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // ── Suggestions (enhanced variant) ──────────────────────────────────────
  const suggestions = useMemo(() => {
    if (variant !== "enhanced" || !value.trim() || value.length < 2) return [];
    const query = value.toLowerCase();
    return items
      .filter((item) => item.title.toLowerCase().includes(query))
      .slice(0, 5)
      .map((item) => item.title);
  }, [variant, value, items]);

  const dropdownItems = useMemo(() => {
    if (variant !== "enhanced") return [];
    if (value.trim()) {
      return suggestions.map((s) => ({ type: "suggestion" as const, value: s }));
    }
    return recentSearches.map((s) => ({ type: "recent" as const, value: s }));
  }, [variant, value, suggestions, recentSearches]);

  const showDropdown = variant === "enhanced" && isFocused && dropdownItems.length > 0;

  const handleSelect = useCallback(
    (selectedValue: string) => {
      onChange(selectedValue);
      saveRecentSearch(selectedValue);
      inputRef.current?.blur();
    },
    [onChange, saveRecentSearch]
  );

  // ── Keyboard navigation (enhanced dropdown) ────────────────────────────
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (variant === "enhanced" && showDropdown) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, dropdownItems.length - 1));
            return;
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, -1));
            return;
          case "Enter":
            if (selectedIndex >= 0 && dropdownItems[selectedIndex]) {
              e.preventDefault();
              handleSelect(dropdownItems[selectedIndex].value);
            } else if (value.trim()) {
              saveRecentSearch(value.trim());
            }
            return;
        }
      }

      if (e.key === "Escape") {
        if (value) {
          onChange("");
        } else {
          inputRef.current?.blur();
        }
      }
    },
    [variant, showDropdown, selectedIndex, dropdownItems, handleSelect, value, onChange, saveRecentSearch]
  );

  // Reset selection when dropdown changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [dropdownItems]);

  // ── Global keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !isInputElement(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if (variant === "basic" && (e.metaKey || e.ctrlKey) && e.key === "f") {
        const panel = document.querySelector('[data-testid="collection-panel"]');
        if (panel) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }

      if (
        variant === "basic" &&
        e.key === "Escape" &&
        document.activeElement === inputRef.current
      ) {
        if (value) {
          onChange("");
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [variant, value, onChange]);

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  const isFiltering = value.length > 0;

  // ── Enhanced variant ────────────────────────────────────────────────────
  if (variant === "enhanced") {
    return (
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-2 h-7 px-2.5 rounded-md transition-all duration-200",
            "bg-white/5 border border-white/10",
            isFocused
              ? "bg-white/8 border-brand/30 ring-1 ring-brand/10"
              : "hover:bg-white/8"
          )}
        >
          <Search
            className={cn(
              "w-3.5 h-3.5 transition-colors shrink-0",
              value ? "text-brand-hover" : "text-white/30"
            )}
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-hidden"
            aria-label="Search collection items"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
          />
          {value && (
            <button
              onClick={() => onChange("")}
              className="p-0.5 text-white/40 hover:text-white/70 transition-colors"
              tabIndex={-1}
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <kbd className="hidden sm:inline text-[9px] px-1 py-0.5 rounded bg-white/5 text-white/30 font-mono shrink-0">
            /
          </kbd>
        </div>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-1 z-50 py-1 rounded-lg bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-xl"
              role="listbox"
            >
              {!value.trim() && recentSearches.length > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 text-xs text-white/40 uppercase tracking-wide">
                  <span>Recent</span>
                  <button
                    onClick={clearRecentSearches}
                    className="flex items-center gap-1 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              )}

              {dropdownItems.map((item, index) => (
                <button
                  key={`${item.type}-${item.value}`}
                  onClick={() => handleSelect(item.value)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                    selectedIndex === index
                      ? "bg-brand/20 text-brand-hover"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  {item.type === "recent" ? (
                    <Clock className="w-3 h-3 text-white/40 shrink-0" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-brand-hover/70 shrink-0" />
                  )}
                  <span className="truncate">{item.value}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Basic variant ───────────────────────────────────────────────────────
  const hasResults = resultCount > 0;

  return (
    <div
      className="relative flex items-center gap-2"
      data-testid="collection-search-container"
    >
      <div
        className={`
          relative flex items-center gap-2 flex-1 min-w-[200px] max-w-xs
          bg-slate-800/60 dark:bg-slate-900/60
          rounded-lg border transition-all duration-200
          ${
            isFocused
              ? "border-brand/50 ring-1 ring-brand/20 bg-slate-800/80"
              : "border-white/10 hover:border-white/20"
          }
        `}
      >
        <div className="pl-3 flex items-center">
          <Search
            className={`w-4 h-4 transition-colors ${
              isFocused ? "text-brand-hover" : "text-slate-500"
            }`}
          />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="
            flex-1 py-2 pr-2 bg-transparent text-sm text-white
            placeholder:text-slate-500 dark:placeholder:text-slate-600
            focus:outline-hidden
          "
          aria-label="Search collection items"
          data-testid="collection-search-input"
        />

        <AnimatePresence mode="wait">
          {isFiltering ? (
            <motion.button
              key="clear"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              className="pr-2 text-slate-400 hover:text-white transition-colors"
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
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono text-slate-500 bg-slate-700/50 rounded border border-slate-600/30">
                <span className="text-[9px]">/</span>
              </kbd>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isFiltering && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className={`
              text-xs font-mono px-2 py-1 rounded
              ${
                hasResults
                  ? "text-brand-hover bg-brand/10"
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
