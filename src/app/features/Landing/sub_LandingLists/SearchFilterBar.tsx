"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, Hash, Filter, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, useMemo, useTransition } from "react";

import { ELEVATION, INSET, withInset } from "@/components/visual/depth";
import { DURATION } from '@/lib/animations/motion-presets';
import { fuzzyMatch } from "@/lib/search/fuzzy";
import { TopList } from "@/types/top-lists";

import { gradients } from "../shared/gradients";

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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [timePeriodFilter, setTimePeriodFilter] = useState<TimePeriodFilter>("all");
  const [listSizeFilter, setListSizeFilter] = useState<ListSizeFilter>("all");
  const [isFocused, setIsFocused] = useState(false);
  const [, startTransition] = useTransition();

  const inputRef = useRef<HTMLInputElement>(null);
  const prevResultsRef = useRef<string>("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search query - keeps input responsive while deferring expensive filtering
  useEffect(() => {
    debounceTimerRef.current = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(searchQuery);
      });
    }, 150);
    return () => clearTimeout(debounceTimerRef.current);
  }, [searchQuery]);

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

      // Apply fuzzy search (uses debounced query for performance)
      if (debouncedQuery) {
        const titleMatch = fuzzyMatch(debouncedQuery, list.title);
        const categoryMatch = fuzzyMatch(debouncedQuery, list.category);
        const subcategoryMatch = list.subcategory
          ? fuzzyMatch(debouncedQuery, list.subcategory)
          : { matches: false, score: 0 };

        if (titleMatch.matches) {
          results.push({ list, score: titleMatch.score + 1.0, matchField: "title" });
        } else if (categoryMatch.matches) {
          results.push({ list, score: categoryMatch.score + 0.5, matchField: "category" });
        } else if (subcategoryMatch.matches) {
          results.push({ list, score: subcategoryMatch.score, matchField: "subcategory" });
        }
      } else {
        results.push({ list, score: 0, matchField: "title" });
      }
    }

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
  }, [lists, debouncedQuery, timePeriodFilter, listSizeFilter]);

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

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    clearTimeout(debounceTimerRef.current);
    inputRef.current?.focus();
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    clearTimeout(debounceTimerRef.current);
    setTimePeriodFilter("all");
    setListSizeFilter("all");
  };

  const hasActiveFilters = searchQuery.length > 0 || timePeriodFilter !== "all" || listSizeFilter !== "all";

  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.normal }}
    >
      {/* Search and Filter Container */}
      <div
        className="flex flex-col sm:flex-row gap-3 p-4 rounded-container"
        style={{
          background: gradients.panelSurface,
          boxShadow: withInset(ELEVATION.high),
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
        data-testid="search-filter-container"
      >
        {/* Search Input */}
        <div className="relative flex-1">
          <div
            className={`relative flex items-center rounded-card transition-all duration-200 ${
              isFocused ? "ring-2 ring-brand-hover/30" : ""
            }`}
            style={{
              background: gradients.inputSurface,
              border: isFocused
                ? "1px solid rgba(6, 182, 212, 0.5)"
                : "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: isFocused
                ? INSET.focusGlow
                : ELEVATION.none,
            }}
          >
            <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search lists by title, category..."
              className="w-full px-3 py-2.5 bg-transparent text-slate-200 text-sm placeholder-slate-500 focus:outline-hidden"
              data-testid="search-filter-input"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearSearch}
                  className="mr-2 p-1 rounded-control text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 transition-colors
                    focus-ring"
                  data-testid="search-clear-btn"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
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
                className="px-3 py-1.5 rounded-control text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-700/50 hover:bg-slate-600/50 transition-colors flex items-center gap-1.5
                  focus-ring"
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
                {searchQuery && <span> matching &quot;{searchQuery}&quot;</span>}
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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium transition-colors
          focus-ring
          ${
          isActive
            ? "bg-brand/20 text-brand-hover border border-brand/30"
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
            className="absolute top-full left-0 mt-1 min-w-[140px] rounded-card z-dropdown overflow-hidden"
            style={{
              background: gradients.dropdownSurface,
              boxShadow: ELEVATION.overlay,
              border: "1px solid rgba(255,255,255,0.1)",
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
                className={`w-full px-3 py-2 text-left text-xs transition-colors
                  focus-ring
                  ${
                  value === option.value
                    ? "bg-brand/20 text-brand-hover"
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
