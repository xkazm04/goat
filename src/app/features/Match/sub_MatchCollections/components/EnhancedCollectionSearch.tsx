"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, TrendingUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Local storage key for recent searches
const RECENT_SEARCHES_KEY = 'goat-collection-recent-searches';
const MAX_RECENT_SEARCHES = 5;

interface EnhancedCollectionSearchProps {
  value: string;
  onChange: (value: string) => void;
  items?: Array<{ id: string; title: string }>;
  placeholder?: string;
}

/**
 * EnhancedCollectionSearch
 *
 * Search input with:
 * - Recent searches dropdown
 * - Item title suggestions (fuzzy match)
 * - Keyboard navigation
 * - Clear history option
 */
export function EnhancedCollectionSearch({
  value,
  onChange,
  items = [],
  placeholder = "Search items...",
}: EnhancedCollectionSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter(s => s.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Get suggestions based on current input
  const suggestions = useMemo(() => {
    if (!value.trim() || value.length < 2) return [];

    const query = value.toLowerCase();
    return items
      .filter(item => item.title.toLowerCase().includes(query))
      .slice(0, 5)
      .map(item => item.title);
  }, [value, items]);

  // Combine recent searches and suggestions
  const dropdownItems = useMemo(() => {
    if (value.trim()) {
      return suggestions.map(s => ({ type: 'suggestion' as const, value: s }));
    }
    return recentSearches.map(s => ({ type: 'recent' as const, value: s }));
  }, [value, suggestions, recentSearches]);

  // Show dropdown when focused and have items
  const showDropdown = isFocused && dropdownItems.length > 0;

  // Handle selection
  const handleSelect = useCallback((selectedValue: string) => {
    onChange(selectedValue);
    saveRecentSearch(selectedValue);
    inputRef.current?.blur();
  }, [onChange, saveRecentSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, dropdownItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && dropdownItems[selectedIndex]) {
          e.preventDefault();
          handleSelect(dropdownItems[selectedIndex].value);
        } else if (value.trim()) {
          saveRecentSearch(value.trim());
        }
        break;
      case 'Escape':
        inputRef.current?.blur();
        break;
    }
  }, [showDropdown, selectedIndex, dropdownItems, handleSelect, value, saveRecentSearch]);

  // Reset selection when dropdown changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [dropdownItems]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isInputElement(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className={cn(
        "flex items-center gap-2 h-7 px-2.5 rounded-md transition-all duration-200",
        "bg-white/5 border border-white/10",
        isFocused ? "bg-white/8 border-cyan-500/30 ring-1 ring-cyan-500/10" : "hover:bg-white/8"
      )}>
        <Search className={cn(
          "w-3.5 h-3.5 transition-colors shrink-0",
          value ? "text-cyan-400" : "text-white/30"
        )} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-white/30 focus:outline-none"
          aria-label="Search collection items"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        />
        {value && (
          <button
            onClick={() => onChange('')}
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

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 py-1 rounded-lg bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-xl"
            role="listbox"
          >
            {/* Header for recent searches */}
            {!value.trim() && recentSearches.length > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 text-[10px] text-white/40 uppercase tracking-wide">
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

            {/* Dropdown items */}
            {dropdownItems.map((item, index) => (
              <button
                key={`${item.type}-${item.value}`}
                onClick={() => handleSelect(item.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors",
                  selectedIndex === index
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
                role="option"
                aria-selected={selectedIndex === index}
              >
                {item.type === 'recent' ? (
                  <Clock className="w-3 h-3 text-white/40 shrink-0" />
                ) : (
                  <TrendingUp className="w-3 h-3 text-cyan-400/70 shrink-0" />
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

function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export default EnhancedCollectionSearch;
