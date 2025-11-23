"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";
import { useCollectionFiltersContext } from "../context/CollectionFiltersContext";

interface CollectionSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Search input for filtering collection items
 *
 * Can consume filter state from context or use explicit props.
 * When used within CollectionFiltersProvider, props are optional.
 */
export function CollectionSearch({
  value: propValue,
  onChange: propOnChange,
  placeholder = "Search items...",
  className = ""
}: CollectionSearchProps) {
  const [isFocused, setIsFocused] = useState(false);

  // Use context if available, otherwise fall back to props
  const context = useCollectionFiltersContext();

  const value = propValue ?? context.filter.searchTerm;
  const onChange = propOnChange ?? context.setSearchTerm;

  return (
    <div className={`relative ${className}`} data-testid="collection-search-container">
      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors ${
        isFocused ? 'text-cyan-400' : 'text-gray-500'
      }`} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        data-testid="collection-search-input"
        aria-label="Search collection items"
        className="w-full pl-10 pr-10 py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          data-testid="collection-search-clear-btn"
          aria-label="Clear search"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}







