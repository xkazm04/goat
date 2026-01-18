"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight, Folder, Clock, TrendingUp } from "lucide-react";
import { CategorySearchProps, CategoryNode, RecentCategory, STORAGE_KEYS } from "./types";
import { searchTree, findNodeByPath, getPopularCategories } from "./categoryTree";

/**
 * Search Result Item
 */
const SearchResultItem = memo(function SearchResultItem({
  node,
  onClick,
  color,
  index,
}: {
  node: CategoryNode;
  onClick: () => void;
  color: { primary: string; secondary: string; accent: string };
  index: number;
}) {
  const Icon = node.icon || Folder;
  const nodeColor = node.color || color;

  return (
    <motion.button
      className="w-full flex items-center gap-3 p-3 rounded-lg text-left group"
      style={{
        background: "transparent",
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{
        background: `linear-gradient(135deg, ${nodeColor.primary}20, ${nodeColor.secondary}10)`,
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `linear-gradient(135deg, ${nodeColor.primary}30, ${nodeColor.secondary}20)`,
        }}
      >
        <Icon className="w-4 h-4" style={{ color: nodeColor.accent }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {node.label}
          </span>
          {node.trending && (
            <TrendingUp className="w-3 h-3 text-red-400 shrink-0" />
          )}
        </div>

        {/* Path */}
        <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
          {node.path.slice(1, -1).map((segment, i) => (
            <span key={segment} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-2.5 h-2.5" />}
              <span className="capitalize">{segment.replace(/-/g, " ")}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Navigate arrow */}
      <ChevronRight
        className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0"
      />
    </motion.button>
  );
});

/**
 * Recent Category Item
 */
const RecentItem = memo(function RecentItem({
  recent,
  tree,
  onClick,
  color,
}: {
  recent: RecentCategory;
  tree: { nodes: Map<string, CategoryNode> };
  onClick: (node: CategoryNode) => void;
  color: { primary: string; secondary: string; accent: string };
}) {
  const node = findNodeByPath(tree as any, recent.path);
  if (!node) return null;

  const Icon = node.icon || Folder;
  const nodeColor = node.color || color;

  return (
    <motion.button
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        background: "rgba(51, 65, 85, 0.3)",
        border: "1px solid rgba(71, 85, 105, 0.2)",
      }}
      whileHover={{
        background: `${nodeColor.primary}20`,
        borderColor: `${nodeColor.primary}30`,
      }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(node)}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: nodeColor.accent }} />
      <span className="text-xs text-slate-300 truncate">{node.label}</span>
    </motion.button>
  );
});

/**
 * Category Search Component
 * Quick filter within the category browser
 */
export const CategorySearch = memo(function CategorySearch({
  tree,
  onSelect,
  color,
  placeholder = "Search categories...",
}: CategorySearchProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<CategoryNode[]>([]);
  const [recents, setRecents] = useState<RecentCategory[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent categories from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_CATEGORIES);
      if (stored) {
        setRecents(JSON.parse(stored));
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // Save recent category
  const saveRecent = useCallback((node: CategoryNode) => {
    setRecents((prev) => {
      const existing = prev.find((r) => r.id === node.id);
      const updated: RecentCategory[] = existing
        ? prev.map((r) =>
            r.id === node.id
              ? { ...r, timestamp: Date.now(), count: r.count + 1 }
              : r
          )
        : [
            { id: node.id, path: node.path, timestamp: Date.now(), count: 1 },
            ...prev,
          ].slice(0, 5);

      try {
        localStorage.setItem(STORAGE_KEYS.RECENT_CATEGORIES, JSON.stringify(updated));
      } catch (e) {
        // Ignore storage errors
      }

      return updated;
    });
  }, []);

  // Perform search
  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchTree(tree, query, 8);
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [query, tree]);

  // Handle selection
  const handleSelect = useCallback(
    (node: CategoryNode) => {
      saveRecent(node);
      onSelect(node);
      setQuery("");
      setIsFocused(false);
    },
    [onSelect, saveRecent]
  );

  // Clear search
  const handleClear = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  const showDropdown = isFocused && (query.trim() || recents.length > 0);
  const popularCategories = getPopularCategories(tree, 4);

  return (
    <div className="relative w-full">
      {/* Search input */}
      <div
        className="relative flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200"
        style={{
          background: isFocused
            ? `linear-gradient(135deg, ${color.primary}15, ${color.secondary}10)`
            : "linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.4))",
          border: `2px solid ${
            isFocused ? `${color.primary}50` : "rgba(71, 85, 105, 0.3)"
          }`,
          boxShadow: isFocused
            ? `0 4px 20px ${color.primary}15`
            : "0 2px 10px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Search
          className="w-5 h-5 shrink-0"
          style={{ color: isFocused ? color.accent : "rgba(148, 163, 184, 0.6)" }}
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
        />

        {/* Clear button */}
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="p-1 rounded-full hover:bg-slate-700/50"
              onClick={handleClear}
            >
              <X className="w-4 h-4 text-slate-400" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-50"
            style={{
              background: "rgba(15, 23, 42, 0.95)",
              border: `1px solid ${color.primary}30`,
              backdropFilter: "blur(12px)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
            }}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Search results */}
            {query.trim() && results.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-slate-500 px-3 py-1.5">
                  Search Results
                </div>
                <div className="space-y-0.5">
                  {results.map((node, index) => (
                    <SearchResultItem
                      key={node.id}
                      node={node}
                      onClick={() => handleSelect(node)}
                      color={color}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {query.trim() && results.length === 0 && (
              <div className="p-6 text-center">
                <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No categories found</p>
                <p className="text-xs text-slate-600 mt-1">
                  Try a different search term
                </p>
              </div>
            )}

            {/* Recent and popular when not searching */}
            {!query.trim() && (
              <>
                {/* Recent categories */}
                {recents.length > 0 && (
                  <div className="p-3 border-b border-slate-700/50">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
                      <Clock className="w-3 h-3" />
                      <span>Recent</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recents.slice(0, 4).map((recent) => (
                        <RecentItem
                          key={recent.id}
                          recent={recent}
                          tree={tree}
                          onClick={handleSelect}
                          color={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular categories */}
                <div className="p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
                    <TrendingUp className="w-3 h-3" />
                    <span>Popular</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {popularCategories.map((node, index) => (
                      <SearchResultItem
                        key={node.id}
                        node={node}
                        onClick={() => handleSelect(node)}
                        color={color}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default CategorySearch;
