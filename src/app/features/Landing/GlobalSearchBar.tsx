"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Command, Sparkles, ArrowRight, Film, List, FolderOpen, Layout, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuickSearch } from "@/hooks/use-search";
import type { SearchResult, SearchDomain } from "@/lib/search";
import { useCommandPalette } from "@/app/features/CommandPalette";

// =============================================================================
// Constants
// =============================================================================

const DOMAIN_ICONS: Record<SearchDomain, React.ReactNode> = {
  lists: <List className="w-3 h-3" />,
  items: <Film className="w-3 h-3" />,
  groups: <FolderOpen className="w-3 h-3" />,
  blueprints: <Layout className="w-3 h-3" />,
  users: <Sparkles className="w-3 h-3" />,
};

const DOMAIN_COLORS: Record<SearchDomain, string> = {
  lists: "#06b6d4",
  items: "#f59e0b",
  groups: "#8b5cf6",
  blueprints: "#10b981",
  users: "#ec4899",
};

// =============================================================================
// Component
// =============================================================================

interface GlobalSearchBarProps {
  className?: string;
  placeholder?: string;
  /** Whether to show quick results dropdown */
  showQuickResults?: boolean;
  /** Maximum quick results to show */
  maxQuickResults?: number;
}

export function GlobalSearchBar({
  className = "",
  placeholder = "Search lists, items, collections...",
  showQuickResults = true,
  maxQuickResults = 5,
}: GlobalSearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { openCommandPalette } = useCommandPalette();

  // Search for quick results
  const { results, isLoading } = useQuickSearch(query, {
    enabled: isFocused && query.length > 0 && showQuickResults,
    limit: maxQuickResults,
  });

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navigate to result
  const handleNavigateToResult = useCallback(
    (result: SearchResult) => {
      setIsFocused(false);
      setQuery("");
      router.push(result.url);
    },
    [router]
  );

  // Open full command palette
  const handleOpenFullSearch = useCallback(() => {
    setIsFocused(false);
    openCommandPalette();
  }, [openCommandPalette]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsFocused(false);
        inputRef.current?.blur();
        return;
      }

      // Cmd/Ctrl + K opens full palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpenFullSearch();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0 && selectedIndex < results.length) {
          handleNavigateToResult(results[selectedIndex]);
        } else {
          handleOpenFullSearch();
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
    },
    [results, selectedIndex, handleNavigateToResult, handleOpenFullSearch]
  );

  const showResults = isFocused && query.length > 0 && showQuickResults;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <motion.div
        className="relative"
        initial={false}
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={`
            relative flex items-center gap-3 px-4 py-3 rounded-2xl
            bg-black/40 backdrop-blur-md border
            transition-all duration-300
            ${isFocused
              ? "border-amber-500/40 shadow-lg shadow-amber-500/10"
              : "border-white/10 hover:border-white/20"
            }
          `}
        >
          <Search className={`w-5 h-5 transition-colors ${isFocused ? "text-amber-400" : "text-white/40"}`} />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Search lists, items, and collections"
            aria-expanded={showResults}
            aria-controls="search-results"
            aria-autocomplete="list"
            role="combobox"
            className="flex-1 bg-transparent text-white placeholder:text-white/40 focus:outline-none text-sm"
            data-testid="global-search-input"
          />

          {isLoading && (
            <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
          )}

          {/* Keyboard shortcut hint */}
          <div className="flex items-center gap-1 text-white/30">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono flex items-center gap-0.5">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </div>
        </div>

        {/* Glow effect when focused */}
        {isFocused && (
          <motion.div
            className="absolute inset-0 -z-10 rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: "radial-gradient(ellipse at center, rgba(251, 191, 36, 0.15) 0%, transparent 70%)",
              filter: "blur(20px)",
              transform: "scale(1.5)",
            }}
          />
        )}
      </motion.div>

      {/* Quick Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <div
              id="search-results"
              role="listbox"
              aria-label="Search results"
              className="rounded-xl overflow-hidden shadow-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(15, 20, 35, 0.98) 0%, rgba(25, 35, 55, 0.98) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(20px)",
              }}
            >
              {results.length > 0 ? (
                <div className="p-2">
                  {results.map((result, index) => {
                    const domainColor = DOMAIN_COLORS[result.domain];
                    const isSelected = selectedIndex === index;

                    return (
                      <button
                        key={`${result.domain}-${result.id}`}
                        onClick={() => handleNavigateToResult(result)}
                        role="option"
                        aria-selected={isSelected}
                        className={`
                          w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3
                          transition-colors group
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset
                          ${isSelected ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"}
                        `}
                        data-testid={`quick-result-${index}`}
                      >
                        <div
                          className="p-1.5 rounded-md flex-shrink-0"
                          style={{ background: `${domainColor}20` }}
                        >
                          <span style={{ color: domainColor }}>{DOMAIN_ICONS[result.domain]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{result.title}</div>
                          {result.subtitle && (
                            <div className="text-xs text-white/40 truncate">{result.subtitle}</div>
                          )}
                        </div>
                        <ArrowRight
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isSelected ? "text-white" : "text-white/20 group-hover:text-white/40"
                          }`}
                        />
                      </button>
                    );
                  })}

                  {/* See all results */}
                  <button
                    onClick={handleOpenFullSearch}
                    role="option"
                    aria-selected={selectedIndex === results.length}
                    className={`
                      w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3
                      transition-colors border-t border-white/5 mt-2 pt-3
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset
                      ${selectedIndex === results.length ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70"}
                    `}
                  >
                    <Search className="w-4 h-4" />
                    <span className="text-sm">See all results for "{query}"</span>
                    <kbd className="ml-auto px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">
                      Enter
                    </kbd>
                  </button>
                </div>
              ) : (
                <div className="p-4 text-center">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2 text-white/40">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Searching...</span>
                    </div>
                  ) : (
                    <div className="text-white/40">
                      <p className="text-sm">No quick results</p>
                      <button
                        onClick={handleOpenFullSearch}
                        className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 mx-auto
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:rounded"
                      >
                        <Sparkles className="w-3 h-3" />
                        Open full search
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GlobalSearchBar;
