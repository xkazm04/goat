"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  Sparkles,
  Zap,
  ArrowRight,
  Clock,
  Trophy,
  Music,
  Gamepad2,
  BookOpen,
  ChevronRight,
  X,
  Play,
  Plus,
  List,
  Filter,
} from "lucide-react";
import { parseListQuery, generateListTitle, getExampleQueries, ParsedListQuery } from "./lib/parseListQuery";
import { useCreateListWithUser, useTopLists, useUserLists } from "@/hooks/use-top-lists";
import { useTempUser } from "@/hooks/use-temp-user";
import { useListStore } from "@/stores/use-list-store";
import { mapCompositionToCreateListRequest } from "@/types/composition-to-api";
import { toast } from "@/hooks/use-toast";
import { CATEGORY_CONFIG } from "@/lib/config/category-config";
import { TopList } from "@/types/top-lists";

// Color palette by category
const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  Sports: { primary: "#f59e0b", secondary: "#d97706", accent: "#fbbf24" },
  Music: { primary: "#8b5cf6", secondary: "#7c3aed", accent: "#a78bfa" },
  Games: { primary: "#10b981", secondary: "#059669", accent: "#34d399" },
  Stories: { primary: "#ec4899", secondary: "#db2777", accent: "#f472b6" },
};

// Category icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Sports: <Trophy className="w-4 h-4" />,
  Music: <Music className="w-4 h-4" />,
  Games: <Gamepad2 className="w-4 h-4" />,
  Stories: <BookOpen className="w-4 h-4" />,
};

// Command types for action mode
type CommandMode = "search" | "create" | "filter";

// Recent list storage key
const RECENT_LISTS_KEY = "command-palette-recent-lists";
const MAX_RECENT_LISTS = 5;

/**
 * Simple fuzzy search implementation
 * Matches if all characters in the pattern appear in order in the text
 */
function fuzzyMatch(pattern: string, text: string): { matches: boolean; score: number } {
  const pLower = pattern.toLowerCase();
  const tLower = text.toLowerCase();

  // Exact match gets highest score
  if (tLower === pLower) return { matches: true, score: 1 };

  // Contains match gets high score
  if (tLower.includes(pLower)) return { matches: true, score: 0.9 };

  // Word start matching
  const words = tLower.split(/\s+/);
  const patternWords = pLower.split(/\s+/);
  let wordMatchScore = 0;
  for (const pw of patternWords) {
    if (words.some(w => w.startsWith(pw))) {
      wordMatchScore += 0.3;
    }
  }
  if (wordMatchScore > 0) return { matches: true, score: Math.min(wordMatchScore, 0.8) };

  // Fuzzy character matching
  let patternIdx = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -2;

  for (let i = 0; i < tLower.length && patternIdx < pLower.length; i++) {
    if (tLower[i] === pLower[patternIdx]) {
      if (i === lastMatchIdx + 1) consecutiveBonus += 0.1;
      lastMatchIdx = i;
      patternIdx++;
    }
  }

  if (patternIdx === pLower.length) {
    const baseScore = pLower.length / tLower.length;
    return { matches: true, score: Math.min(baseScore + consecutiveBonus, 0.7) };
  }

  return { matches: false, score: 0 };
}

/**
 * Filter and sort lists based on search query
 */
function searchLists(
  lists: TopList[],
  query: string,
  categoryFilter?: string
): TopList[] {
  if (!query.trim() && !categoryFilter) return lists;

  let filtered = lists;

  // Apply category filter if specified
  if (categoryFilter) {
    filtered = filtered.filter(list =>
      list.category?.toLowerCase() === categoryFilter.toLowerCase()
    );
  }

  if (!query.trim()) return filtered;

  // Apply fuzzy search
  const results = filtered
    .map(list => {
      const titleMatch = fuzzyMatch(query, list.title);
      const categoryMatch = fuzzyMatch(query, list.category || '');
      const subcategoryMatch = fuzzyMatch(query, list.subcategory || '');

      const bestScore = Math.max(
        titleMatch.score,
        categoryMatch.score * 0.7,
        subcategoryMatch.score * 0.6
      );

      return {
        list,
        score: bestScore,
        matches: titleMatch.matches || categoryMatch.matches || subcategoryMatch.matches
      };
    })
    .filter(result => result.matches)
    .sort((a, b) => b.score - a.score);

  return results.map(r => r.list);
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RecentListEntry {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  accessedAt: number;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [recentLists, setRecentLists] = useState<RecentListEntry[]>([]);
  const [mode, setMode] = useState<CommandMode>("search");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);

  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const createListMutation = useCreateListWithUser();

  // Fetch user lists for search
  const { data: userLists = [], isLoading: isLoadingUserLists } = useUserLists(
    tempUserId,
    { limit: 50 },
    { enabled: isOpen && isLoaded && !!tempUserId }
  );

  // Fetch featured lists for broader search
  const { data: featuredLists = [], isLoading: isLoadingFeatured } = useTopLists(
    { limit: 50 },
    { enabled: isOpen }
  );

  // Combine all lists for search
  const allLists = useMemo(() => {
    const combined = [...userLists];
    // Add featured lists that aren't already in user lists
    const userListIds = new Set(userLists.map(l => l.id));
    for (const list of featuredLists) {
      if (!userListIds.has(list.id)) {
        combined.push(list);
      }
    }
    return combined;
  }, [userLists, featuredLists]);

  // Parse the current query for create mode
  const parsedQuery = useMemo(() => parseListQuery(query), [query]);
  const generatedTitle = useMemo(
    () => query.trim() ? generateListTitle(parsedQuery) : "",
    [parsedQuery, query]
  );

  // Detect if query is a "new" command (e.g., "new action movies" or "create top 10")
  const isCreateCommand = useMemo(() => {
    const lower = query.toLowerCase().trim();
    return lower.startsWith("new ") ||
           lower.startsWith("create ") ||
           lower.startsWith("make ");
  }, [query]);

  // Get the actual search query (remove "new/create" prefix if present)
  const searchQuery = useMemo(() => {
    const lower = query.toLowerCase().trim();
    if (lower.startsWith("new ")) return query.slice(4);
    if (lower.startsWith("create ")) return query.slice(7);
    if (lower.startsWith("make ")) return query.slice(5);
    return query;
  }, [query]);

  // Filter lists based on search query
  const filteredLists = useMemo(() => {
    if (isCreateCommand) return [];
    return searchLists(allLists, searchQuery, categoryFilter).slice(0, 8);
  }, [allLists, searchQuery, categoryFilter, isCreateCommand]);

  // Get suggestions based on query (for create mode)
  const createSuggestions = useMemo(() => {
    if (!isCreateCommand && !mode) return [];

    const actualQuery = searchQuery;
    if (!actualQuery.trim()) {
      return getExampleQueries();
    }

    // Generate smart suggestions based on partial query
    const suggestions: string[] = [];
    const lowerQuery = actualQuery.toLowerCase();

    // Size suggestions
    if (!lowerQuery.includes("top") && !lowerQuery.includes("best")) {
      suggestions.push(`top 10 ${actualQuery}`);
      suggestions.push(`top 25 ${actualQuery}`);
    }

    // Category suggestions if no category detected
    if (parsedQuery.confidence < 0.5) {
      Object.keys(CATEGORY_CONFIG).forEach((cat) => {
        suggestions.push(`${actualQuery} ${cat.toLowerCase()}`);
      });
    }

    // Time period suggestions
    if (!lowerQuery.includes("all-time") && !lowerQuery.includes("2020") && !lowerQuery.includes("2024")) {
      suggestions.push(`${actualQuery} all-time`);
    }

    return suggestions.slice(0, 5);
  }, [searchQuery, parsedQuery.confidence, isCreateCommand, mode]);

  // Calculate total items for keyboard navigation
  const totalItems = useMemo(() => {
    if (query.trim()) {
      if (isCreateCommand) {
        return createSuggestions.length + 1; // +1 for create action
      }
      return filteredLists.length + 1; // +1 for create new option
    }
    // Empty state: recent lists + recent queries/examples + category filters
    return recentLists.length + recentQueries.length + getExampleQueries().length + Object.keys(CATEGORY_CONFIG).length;
  }, [query, isCreateCommand, createSuggestions.length, filteredLists.length, recentLists.length, recentQueries.length]);

  // Load recent queries and lists from localStorage
  useEffect(() => {
    const storedQueries = localStorage.getItem("command-palette-recent");
    if (storedQueries) {
      try {
        setRecentQueries(JSON.parse(storedQueries).slice(0, 5));
      } catch {
        // Ignore parse errors
      }
    }

    const storedLists = localStorage.getItem(RECENT_LISTS_KEY);
    if (storedLists) {
      try {
        setRecentLists(JSON.parse(storedLists).slice(0, MAX_RECENT_LISTS));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save recent query
  const saveRecentQuery = useCallback((q: string) => {
    const updated = [q, ...recentQueries.filter((r) => r !== q)].slice(0, 5);
    setRecentQueries(updated);
    localStorage.setItem("command-palette-recent", JSON.stringify(updated));
  }, [recentQueries]);

  // Save recent list
  const saveRecentList = useCallback((list: TopList) => {
    const entry: RecentListEntry = {
      id: list.id,
      title: list.title,
      category: list.category,
      subcategory: list.subcategory,
      accessedAt: Date.now(),
    };
    const updated = [entry, ...recentLists.filter((r) => r.id !== list.id)].slice(0, MAX_RECENT_LISTS);
    setRecentLists(updated);
    localStorage.setItem(RECENT_LISTS_KEY, JSON.stringify(updated));
  }, [recentLists]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setIsCreating(false);
      setMode("search");
      setCategoryFilter(undefined);
    }
  }, [isOpen]);

  // Navigate to a list
  const handleNavigateToList = useCallback((list: TopList) => {
    saveRecentList(list);
    setCurrentList(list);
    onClose();
    router.push(`/match-test?list=${list.id}`);
  }, [saveRecentList, setCurrentList, onClose, router]);

  // Navigate to a recent list entry
  const handleNavigateToRecentList = useCallback((entry: RecentListEntry) => {
    // Find the full list data if available
    const fullList = allLists.find(l => l.id === entry.id);
    if (fullList) {
      handleNavigateToList(fullList);
    } else {
      // Navigate even without full data
      onClose();
      router.push(`/match-test?list=${entry.id}`);
    }
  }, [allLists, handleNavigateToList, onClose, router]);

  // Create list from parsed query
  const handleCreateList = useCallback(async (queryOverride?: string) => {
    const targetQuery = queryOverride || searchQuery;
    if (!targetQuery.trim() || isCreating) return;
    if (!isLoaded || !tempUserId) {
      toast({
        title: "Not Ready",
        description: "Please wait while we prepare your session...",
      });
      return;
    }

    setIsCreating(true);
    saveRecentQuery(targetQuery.trim());

    try {
      const queryParsed = parseListQuery(targetQuery);
      const title = generateListTitle(queryParsed);
      const colors = CATEGORY_COLORS[queryParsed.category] || CATEGORY_COLORS.Sports;

      const compositionData = {
        selectedCategory: queryParsed.category,
        selectedSubcategory: queryParsed.subcategory,
        hierarchy: queryParsed.hierarchy,
        timePeriod: queryParsed.timePeriod,
        selectedDecade: queryParsed.decade,
        selectedYear: queryParsed.year,
        color: colors,
        title: title,
      };

      const createListRequest = mapCompositionToCreateListRequest(compositionData, tempUserId);
      const result = await createListMutation.mutateAsync(createListRequest);

      const enhancedListData = {
        ...result.list,
        metadata: {
          size: queryParsed.hierarchy,
          selectedCategory: queryParsed.category,
          selectedSubcategory: queryParsed.subcategory,
          timePeriod: queryParsed.timePeriod,
          selectedDecade: queryParsed.decade ? parseInt(queryParsed.decade) : undefined,
          selectedYear: queryParsed.year ? parseInt(queryParsed.year) : undefined,
          color: colors,
        },
      };

      setCurrentList(enhancedListData);
      onClose();
      router.push(`/match-test?list=${result.list.id}`);
    } catch (error) {
      console.error("Error creating list:", error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create list",
      });
      setIsCreating(false);
    }
  }, [
    searchQuery,
    isCreating,
    isLoaded,
    tempUserId,
    saveRecentQuery,
    createListMutation,
    setCurrentList,
    onClose,
    router,
  ]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (categoryFilter) {
          setCategoryFilter(undefined);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();

        if (query.trim()) {
          if (isCreateCommand) {
            // In create mode, create the list
            handleCreateList();
          } else if (filteredLists.length > 0 && selectedIndex < filteredLists.length) {
            // Navigate to selected list
            handleNavigateToList(filteredLists[selectedIndex]);
          } else {
            // Create new list option selected
            handleCreateList();
          }
        } else {
          // Empty query - handle based on selected section
          if (recentLists.length > 0 && selectedIndex < recentLists.length) {
            handleNavigateToRecentList(recentLists[selectedIndex]);
          } else if (recentQueries.length > 0) {
            const queryIdx = selectedIndex - recentLists.length;
            if (queryIdx >= 0 && queryIdx < recentQueries.length) {
              setQuery(recentQueries[queryIdx]);
            }
          }
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        if (query.trim() && filteredLists.length > 0 && selectedIndex < filteredLists.length) {
          // Tab fills in the list title for further filtering
          setQuery(filteredLists[selectedIndex].title);
        } else if (createSuggestions[selectedIndex]) {
          setQuery(createSuggestions[selectedIndex]);
        }
        return;
      }
    },
    [
      onClose,
      query,
      categoryFilter,
      isCreateCommand,
      filteredLists,
      selectedIndex,
      totalItems,
      recentLists,
      recentQueries,
      createSuggestions,
      handleCreateList,
      handleNavigateToList,
      handleNavigateToRecentList,
    ]
  );

  // Get current category color
  const categoryColor = CATEGORY_COLORS[parsedQuery.category] || CATEGORY_COLORS.Sports;

  // Check if loading
  const isLoading = isLoadingUserLists || isLoadingFeatured;

  // Render a list item
  const renderListItem = (list: TopList, index: number, isSelected: boolean) => {
    const listColor = CATEGORY_COLORS[list.category] || CATEGORY_COLORS.Sports;
    const isUserList = userLists.some(l => l.id === list.id);

    return (
      <button
        key={list.id}
        onClick={() => handleNavigateToList(list)}
        className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors group ${
          isSelected
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/5"
        }`}
        data-testid={`command-palette-list-${index}`}
      >
        <div
          className="p-1.5 rounded-md flex-shrink-0"
          style={{ background: `${listColor.primary}20` }}
        >
          {CATEGORY_ICONS[list.category] || <List className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{list.title}</div>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <span>{list.category}</span>
            {list.subcategory && (
              <>
                <ChevronRight className="w-3 h-3" />
                <span>{list.subcategory}</span>
              </>
            )}
            {isUserList && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px]">
                Your list
              </span>
            )}
          </div>
        </div>
        <Play
          className={`w-4 h-4 flex-shrink-0 transition-colors ${
            isSelected ? "text-white" : "text-white/30 group-hover:text-white/60"
          }`}
        />
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-start justify-center pt-[12vh]"
          onClick={onClose}
          data-testid="command-palette-backdrop"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="command-palette-container"
          >
            <div
              className="rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: `linear-gradient(135deg, rgba(15, 20, 35, 0.98) 0%, rgba(25, 35, 55, 0.98) 100%)`,
                boxShadow: `0 25px 60px rgba(0, 0, 0, 0.5), 0 0 80px ${categoryColor.primary}20`,
                border: `1px solid rgba(255, 255, 255, 0.08)`,
              }}
            >
              {/* Search input */}
              <div className="relative">
                <div className="flex items-center px-4 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2 text-white/40">
                    <Command className="w-4 h-4" />
                    <span className="text-sm font-medium">K</span>
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search lists or type 'new action movies' to create..."
                    className="flex-1 ml-4 bg-transparent text-white text-lg placeholder:text-white/30 focus:outline-none"
                    data-testid="command-palette-input"
                    disabled={isCreating}
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="p-1 rounded-full hover:bg-white/10 transition-colors"
                      data-testid="command-palette-clear-btn"
                    >
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  )}
                </div>

                {/* Category filter bar */}
                {!query.trim() && (
                  <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs text-white/40 flex items-center gap-1.5 flex-shrink-0">
                      <Filter className="w-3 h-3" />
                      Filter:
                    </span>
                    {Object.keys(CATEGORY_CONFIG).map((cat) => {
                      const isActive = categoryFilter === cat;
                      const catColor = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Sports;
                      return (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(isActive ? undefined : cat)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
                            isActive
                              ? "text-white"
                              : "text-white/50 hover:text-white/80"
                          }`}
                          style={{
                            background: isActive ? `${catColor.primary}40` : "rgba(255,255,255,0.05)",
                            borderColor: isActive ? catColor.primary : "transparent",
                          }}
                          data-testid={`command-palette-filter-${cat.toLowerCase()}`}
                        >
                          {CATEGORY_ICONS[cat]}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Create mode preview (when using new/create prefix) */}
                {isCreateCommand && searchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 py-3 border-b border-white/5"
                    style={{
                      background: `linear-gradient(90deg, ${categoryColor.primary}10, transparent)`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ background: `${categoryColor.primary}20` }}
                        >
                          <Plus className="w-4 h-4" style={{ color: categoryColor.primary }} />
                        </div>
                        <div>
                          <div className="text-white font-medium">{generatedTitle}</div>
                          <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                            <span>{parsedQuery.category}</span>
                            {parsedQuery.subcategory && (
                              <>
                                <ChevronRight className="w-3 h-3" />
                                <span>{parsedQuery.subcategory}</span>
                              </>
                            )}
                            <span className="mx-1">•</span>
                            <span>Top {parsedQuery.hierarchy}</span>
                          </div>
                        </div>
                      </div>
                      <div
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: `${categoryColor.primary}20`,
                          color: categoryColor.primary,
                        }}
                      >
                        Creating new list
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Main content area */}
              <div className="max-h-[50vh] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  </div>
                ) : query.trim() ? (
                  // Search results
                  <div className="p-2">
                    {isCreateCommand ? (
                      // Create mode - show suggestions for list creation
                      <>
                        {createSuggestions.length > 0 && (
                          <>
                            <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                              <Sparkles className="w-3 h-3" />
                              Suggestions
                            </div>
                            {createSuggestions.map((suggestion, i) => (
                              <button
                                key={`suggestion-${i}`}
                                onClick={() => handleCreateList(suggestion)}
                                className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors ${
                                  selectedIndex === i
                                    ? "bg-white/10 text-white"
                                    : "text-white/70 hover:bg-white/5"
                                }`}
                                data-testid={`command-palette-create-suggestion-${i}`}
                              >
                                <Plus className="w-4 h-4 text-white/40" />
                                <span>{suggestion}</span>
                              </button>
                            ))}
                          </>
                        )}
                      </>
                    ) : (
                      // Search mode - show matching lists
                      <>
                        {filteredLists.length > 0 ? (
                          <>
                            <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                              <List className="w-3 h-3" />
                              Lists ({filteredLists.length})
                            </div>
                            {filteredLists.map((list, i) =>
                              renderListItem(list, i, selectedIndex === i)
                            )}
                          </>
                        ) : (
                          <div className="px-3 py-6 text-center text-white/40">
                            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No lists found for "{searchQuery}"</p>
                            <p className="text-xs mt-1">Try typing "new {searchQuery}" to create one</p>
                          </div>
                        )}

                        {/* Create new option */}
                        <div className="border-t border-white/5 mt-2 pt-2">
                          <button
                            onClick={() => handleCreateList()}
                            className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors ${
                              selectedIndex === filteredLists.length
                                ? "bg-white/10 text-white"
                                : "text-white/70 hover:bg-white/5"
                            }`}
                            data-testid="command-palette-create-new"
                          >
                            <div
                              className="p-1.5 rounded-md"
                              style={{ background: `${categoryColor.primary}20` }}
                            >
                              <Plus className="w-4 h-4" style={{ color: categoryColor.primary }} />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">Create "{generatedTitle}"</div>
                              <div className="text-xs text-white/40">New list from your query</div>
                            </div>
                            <Zap className="w-4 h-4 text-white/30" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  // Empty state - show recent lists, recent queries, and examples
                  <div className="p-2">
                    {/* Recent Lists */}
                    {recentLists.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Recent Lists
                        </div>
                        {recentLists.map((entry, i) => {
                          const listColor = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.Sports;
                          return (
                            <button
                              key={`recent-list-${entry.id}`}
                              onClick={() => handleNavigateToRecentList(entry)}
                              className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors group ${
                                selectedIndex === i
                                  ? "bg-white/10 text-white"
                                  : "text-white/70 hover:bg-white/5"
                              }`}
                              data-testid={`command-palette-recent-list-${i}`}
                            >
                              <div
                                className="p-1.5 rounded-md flex-shrink-0"
                                style={{ background: `${listColor.primary}20` }}
                              >
                                {CATEGORY_ICONS[entry.category] || <List className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{entry.title}</div>
                                <div className="flex items-center gap-1.5 text-xs text-white/40">
                                  <span>{entry.category}</span>
                                  {entry.subcategory && (
                                    <>
                                      <ChevronRight className="w-3 h-3" />
                                      <span>{entry.subcategory}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Play
                                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                                  selectedIndex === i ? "text-white" : "text-white/30 group-hover:text-white/60"
                                }`}
                              />
                            </button>
                          );
                        })}
                        <div className="border-t border-white/5 my-2" />
                      </>
                    )}

                    {/* Recent Queries */}
                    {recentQueries.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                          <Search className="w-3 h-3" />
                          Recent Searches
                        </div>
                        {recentQueries.map((recent, i) => {
                          const idx = recentLists.length + i;
                          return (
                            <button
                              key={`recent-${i}`}
                              onClick={() => setQuery(recent)}
                              className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors ${
                                selectedIndex === idx
                                  ? "bg-white/10 text-white"
                                  : "text-white/70 hover:bg-white/5"
                              }`}
                              data-testid={`command-palette-recent-query-${i}`}
                            >
                              <Clock className="w-4 h-4 text-white/40" />
                              <span>{recent}</span>
                            </button>
                          );
                        })}
                        <div className="border-t border-white/5 my-2" />
                      </>
                    )}

                    {/* Example Queries */}
                    <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      Quick Actions
                    </div>
                    {getExampleQueries().slice(0, 4).map((example, i) => {
                      const idx = recentLists.length + recentQueries.length + i;
                      return (
                        <button
                          key={`example-${i}`}
                          onClick={() => setQuery(`new ${example}`)}
                          className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors ${
                            selectedIndex === idx
                              ? "bg-white/10 text-white"
                              : "text-white/70 hover:bg-white/5"
                          }`}
                          data-testid={`command-palette-example-${i}`}
                        >
                          <Plus className="w-4 h-4 text-white/40" />
                          <span>Create {example}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer with keyboard hints */}
              <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">
                      <ArrowRight className="w-3 h-3 rotate-[-90deg]" />
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">
                      <ArrowRight className="w-3 h-3 rotate-90" />
                    </kbd>
                    <span>navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">
                      Enter
                    </kbd>
                    <span>{query.trim() && filteredLists.length > 0 ? "open" : "create"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">
                      Tab
                    </kbd>
                    <span>autocomplete</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">
                      Esc
                    </kbd>
                    <span>close</span>
                  </div>
                </div>

                {query.trim() && (
                  <button
                    onClick={() => handleCreateList()}
                    disabled={isCreating || !isLoaded}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      isCreating
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:scale-105"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${categoryColor.primary}, ${categoryColor.secondary})`,
                      color: "white",
                    }}
                    data-testid="command-palette-create-btn"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Create</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
