"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, Hash, Filter, ChevronDown } from "lucide-react";
import { TopList } from "@/types/top-lists";

// Simple fuzzy search implementation
function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  if (!query) return { match: true, score: 0 };

  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    return { match: true, score: queryLower.length / textLower.length * 100 };
  }

  // Fuzzy match - check if all characters exist in order
  let queryIndex = 0;
  let matchCount = 0;
  let lastMatchIndex = -1;
  let consecutiveBonus = 0;

  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      matchCount++;
      if (lastMatchIndex === i - 1) {
        consecutiveBonus += 2;
      }
      lastMatchIndex = i;
      queryIndex++;
    }
  }

  if (queryIndex === queryLower.length) {
    const score = (matchCount / textLower.length * 50) + consecutiveBonus;
    return { match: true, score };
  }

  return { match: false, score: 0 };
}

export interface SearchFilterResult {
  list: TopList;
  score: number;
  matchField: "title" | "category" | "subcategory";
}

export type TimePeriodFilter = "all" | "all-time" | "decade" | "year";
export type ListSizeFilter = "all" | 10 | 20 | 50 | 100;

interface SearchFilterBarProps {
  lists: TopList[];
  onFilteredResults: (results: SearchFilterResult[]) => void;
  onSearchActive: (active: boolean) => void;
  className?: string;
}

const TIME_PERIOD_OPTIONS: { value: TimePeriodFilter; label: string }[] = [
  { value: "all", label: "All Time Periods" },
  { value: "all-time", label: "All-Time" },
  { value: "decade", label: "Decade" },
  { value: "year", label: "Year" },
];

const LIST_SIZE_OPTIONS: { value: ListSizeFilter; label: string }[] = [
  { value: "all", label: "All Sizes" },
  { value: 10, label: "Top 10" },
  { value: 20, label: "Top 20" },
  { value: 50, label: "Top 50" },
  { value: 100, label: "Top 100" },
];

export function SearchFilterBar({
  lists,
  onFilteredResults,
  onSearchActive,
  className,
}: SearchFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [timePeriodFilter, setTimePeriodFilter] = useState<TimePeriodFilter>("all");
  const [listSizeFilter, setListSizeFilter] = useState<ListSizeFilter>("all");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevResultsRef = useRef<string>("");

  // Compute filtered results
  const filteredResults = useMemo(() => {
    const results: SearchFilterResult[] = [];

    for (const list of lists) {
      // Apply time period filter
      if (timePeriodFilter !== "all") {
        const listPeriod = list.time_period || "all-time";
        if (listPeriod !== timePeriodFilter) continue;
      }

      // Apply list size filter
      if (listSizeFilter !== "all") {
        if (list.size !== listSizeFilter) continue;
      }

      // Apply fuzzy search
      if (searchQuery) {
        const titleMatch = fuzzyMatch(list.title, searchQuery);
        const categoryMatch = fuzzyMatch(list.category, searchQuery);
        const subcategoryMatch = list.subcategory
          ? fuzzyMatch(list.subcategory, searchQuery)
          : { match: false, score: 0 };

        if (titleMatch.match) {
          results.push({ list, score: titleMatch.score + 10, matchField: "title" });
        } else if (categoryMatch.match) {
          results.push({ list, score: categoryMatch.score + 5, matchField: "category" });
        } else if (subcategoryMatch.match) {
          results.push({ list, score: subcategoryMatch.score, matchField: "subcategory" });
        }
      } else {
        results.push({ list, score: 0, matchField: "title" });
      }
    }

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
  }, [lists, searchQuery, timePeriodFilter, listSizeFilter]);

  // Notify parent of filtered results only when they actually change
  useEffect(() => {
    // Create a stable key from result IDs to detect actual changes
    const resultsKey = filteredResults.map(r => r.list.id).join(",");
    if (resultsKey !== prevResultsRef.current) {
      prevResultsRef.current = resultsKey;
      onFilteredResults(filteredResults);
    }
  }, [filteredResults, onFilteredResults]);

  // Notify parent of search active state
  useEffect(() => {
    const isActive = searchQuery.length > 0 || timePeriodFilter !== "all" || listSizeFilter !== "all";
    onSearchActive(isActive);
  }, [searchQuery, timePeriodFilter, listSizeFilter, onSearchActive]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
          // Could trigger a selection action here
          setShowDropdown(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        inputRef.current?.blur();
        break;
    }
  }, [showDropdown, filteredResults.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll("[data-result-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setTimePeriodFilter("all");
    setListSizeFilter("all");
    setSelectedIndex(-1);
  };

  const hasActiveFilters = searchQuery.length > 0 || timePeriodFilter !== "all" || listSizeFilter !== "all";

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Search and Filter Container */}
      <div
        className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl"
        style={{
          background: `
            linear-gradient(135deg,
              rgba(15, 23, 42, 0.8) 0%,
              rgba(30, 41, 59, 0.6) 50%,
              rgba(15, 23, 42, 0.8) 100%
            )
          `,
          boxShadow: `
            0 4px 20px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
        data-testid="search-filter-container"
      >
        {/* Search Input */}
        <div className="relative flex-1">
          <div
            className={`relative flex items-center rounded-xl transition-all duration-200 ${
              isFocused ? "ring-2 ring-cyan-400/30" : ""
            }`}
            style={{
              background: `
                linear-gradient(135deg,
                  rgba(30, 41, 59, 0.8) 0%,
                  rgba(51, 65, 85, 0.9) 100%
                )
              `,
              border: isFocused
                ? "1px solid rgba(6, 182, 212, 0.5)"
                : "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: isFocused
                ? "0 0 20px rgba(6, 182, 212, 0.15)"
                : "none",
            }}
          >
            <Search className="w-4 h-4 text-slate-400 ml-3 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(-1);
                setShowDropdown(true);
              }}
              onFocus={() => {
                setIsFocused(true);
                if (searchQuery.length > 0) setShowDropdown(true);
              }}
              onBlur={() => {
                setIsFocused(false);
                // Delay hiding dropdown to allow click events
                setTimeout(() => setShowDropdown(false), 150);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search lists by title, category..."
              className="w-full px-3 py-2.5 bg-transparent text-slate-200 text-sm placeholder-slate-500 focus:outline-none"
              data-testid="search-filter-input"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearSearch}
                  className="mr-2 p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 transition-colors"
                  data-testid="search-clear-btn"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Search Dropdown */}
          <AnimatePresence>
            {showDropdown && searchQuery.length > 0 && filteredResults.length > 0 && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-xl z-50"
                style={{
                  background: `
                    linear-gradient(135deg,
                      rgba(15, 23, 42, 0.98) 0%,
                      rgba(30, 41, 59, 0.98) 100%
                    )
                  `,
                  boxShadow: `
                    0 10px 40px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05)
                  `,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
                data-testid="search-dropdown"
              >
                <div className="p-2">
                  <div className="text-xs text-slate-500 px-2 py-1 mb-1">
                    {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} found
                  </div>
                  {filteredResults.slice(0, 8).map((result, index) => (
                    <motion.div
                      key={result.list.id}
                      data-result-item
                      className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? "bg-cyan-500/20 text-cyan-200"
                          : "text-slate-300 hover:bg-slate-700/50"
                      }`}
                      onClick={() => {
                        // Could navigate or select the list
                        setShowDropdown(false);
                      }}
                      data-testid={`search-result-${result.list.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {result.list.title}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{result.list.category}</span>
                            {result.list.subcategory && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span>{result.list.subcategory}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                          Top {result.list.size}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Period Filter */}
          <FilterChip
            icon={<Clock className="w-3.5 h-3.5" />}
            label={TIME_PERIOD_OPTIONS.find(o => o.value === timePeriodFilter)?.label || "Time Period"}
            options={TIME_PERIOD_OPTIONS}
            value={timePeriodFilter}
            onChange={(v) => setTimePeriodFilter(v as TimePeriodFilter)}
            isActive={timePeriodFilter !== "all"}
            testId="filter-time-period"
          />

          {/* List Size Filter */}
          <FilterChip
            icon={<Hash className="w-3.5 h-3.5" />}
            label={LIST_SIZE_OPTIONS.find(o => o.value === listSizeFilter)?.label || "Size"}
            options={LIST_SIZE_OPTIONS}
            value={listSizeFilter}
            onChange={(v) => setListSizeFilter(v as ListSizeFilter)}
            isActive={listSizeFilter !== "all"}
            testId="filter-list-size"
          />

          {/* Clear All Button */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={clearAllFilters}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-700/50 hover:bg-slate-600/50 transition-colors flex items-center gap-1.5"
                data-testid="filter-clear-all-btn"
              >
                <X className="w-3 h-3" />
                Clear All
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active Filter Summary */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 px-4"
          >
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="w-3 h-3" />
              <span>
                Showing {filteredResults.length} list{filteredResults.length !== 1 ? "s" : ""}
                {searchQuery && <span> matching "{searchQuery}"</span>}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Filter Chip Component
interface FilterChipProps<T> {
  icon: React.ReactNode;
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  isActive: boolean;
  testId: string;
}

function FilterChip<T extends string | number>({
  icon,
  label,
  options,
  value,
  onChange,
  isActive,
  testId,
}: FilterChipProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={chipRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          isActive
            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
            : "bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-600/50 hover:text-slate-300"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        data-testid={`${testId}-btn`}
      >
        {icon}
        <span>{label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 mt-1 min-w-[140px] rounded-lg z-50 overflow-hidden"
            style={{
              background: `
                linear-gradient(135deg,
                  rgba(15, 23, 42, 0.98) 0%,
                  rgba(30, 41, 59, 0.98) 100%
                )
              `,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
            data-testid={`${testId}-dropdown`}
          >
            {options.map((option) => (
              <button
                key={String(option.value)}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                  value === option.value
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
                data-testid={`${testId}-option-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
