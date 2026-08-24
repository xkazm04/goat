"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Command,
  Sparkles,
  Zap,
  ArrowRight,
  Clock,
  ChevronRight,
  X,
  Play,
  Plus,
  List,
  Filter,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";


import { GoatMascot } from "@/components/visual/GoatMascot";
import { TopList } from "@/types/top-lists";
import { createListIntent } from "@/types/list-intent";
import { listCreationService } from "@/services/list-creation-service";
import { ELEVATION } from "@/components/visual/depth";
import { useQuickSearch, useSearchHistory } from "@/hooks/use-search";
import { useTempUser } from "@/hooks/use-temp-user";
import { toast } from "@/hooks/use-toast";
import { useTopLists, useUserLists } from "@/hooks/use-top-lists";
import { DURATION } from "@/lib/animations/motion-presets";
import { CATEGORY_CONFIG } from "@/lib/config/category-config";
import { trackError } from "@/lib/errors/error-analytics";
import { fuzzyMatch } from "@/lib/search/fuzzy";
import { useListStore } from "@/stores/use-list-store";

import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  DOMAIN_ICONS,
  DOMAIN_LABELS,
  DOMAIN_COLORS,
  DOMAIN_FILTERS,
} from "./constants";
import { parseListQuery, generateListTitle, getExampleQueries } from "./lib/parseListQuery";
import { useCommandPaletteStore } from "./useCommandPalette";

import type { SearchResult, SearchDomain } from "@/lib/search";

// Recent list storage key
const RECENT_LISTS_KEY = "command-palette-recent-lists";
const MAX_RECENT_LISTS = 5;

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

  if (categoryFilter) {
    filtered = filtered.filter(list =>
      list.category?.toLowerCase() === categoryFilter.toLowerCase()
    );
  }

  if (!query.trim()) return filtered;

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

/**
 * Parse domain filter prefix from query (e.g., "/list batman" -> domain: "lists", query: "batman")
 */
function parseDomainFilter(query: string): { domain?: SearchDomain; cleanQuery: string } {
  // Slice the remainder from the TRIMMED query (same length/offset as lowerQuery),
  // not the raw query — leading whitespace previously shifted the slice offset so
  // the prefix leaked into the search term or the wrong chars were dropped.
  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();

  for (const [prefix, domain] of Object.entries(DOMAIN_FILTERS)) {
    if (lowerQuery.startsWith(prefix + " ") || lowerQuery === prefix) {
      return {
        domain,
        cleanQuery: trimmedQuery.slice(prefix.length).trim(),
      };
    }
  }

  return { cleanQuery: trimmedQuery };
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
  const [recentLists, setRecentLists] = useState<RecentListEntry[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);

  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const { history, addToHistory } = useSearchHistory();

  // Parse query for domain filter prefix (e.g., "/list", "/items")
  const { domain: filterDomain, cleanQuery } = useMemo(
    () => parseDomainFilter(query),
    [query]
  );

  // Detect create command prefixes
  const isCreateCommand = useMemo(() => {
    const lower = cleanQuery.toLowerCase().trim();
    return lower.startsWith("new ") ||
           lower.startsWith("create ") ||
           lower.startsWith("make ");
  }, [cleanQuery]);

  // Get the actual search query (remove "new/create" prefix if present)
  const searchQuery = useMemo(() => {
    const lower = cleanQuery.toLowerCase().trim();
    if (lower.startsWith("new ")) return cleanQuery.slice(4);
    if (lower.startsWith("create ")) return cleanQuery.slice(7);
    if (lower.startsWith("make ")) return cleanQuery.slice(5);
    return cleanQuery;
  }, [cleanQuery]);

  // API-backed universal search (searches lists, items, groups, blueprints, users)
  const { results: apiResults, isLoading: isSearchLoading, failedDomains } = useQuickSearch(searchQuery, {
    enabled: isOpen && !isCreateCommand && searchQuery.length > 0,
    domains: filterDomain ? [filterDomain] : undefined,
    limit: 12,
  });

  // Fetch user lists for client-side search fallback
  const { data: userLists = [], isLoading: isLoadingUserLists } = useUserLists(
    tempUserId,
    { limit: 50 },
    { enabled: isOpen && isLoaded && !!tempUserId && !filterDomain }
  );

  // Fetch featured lists for broader search
  const { data: featuredLists = [], isLoading: isLoadingFeatured } = useTopLists(
    { limit: 50 },
    { enabled: isOpen && !filterDomain }
  );

  // Combine all lists for client-side search
  const allLists = useMemo(() => {
    const combined = [...userLists];
    const userListIds = new Set(userLists.map(l => l.id));
    for (const list of featuredLists) {
      if (!userListIds.has(list.id)) {
        combined.push(list);
      }
    }
    return combined;
  }, [userLists, featuredLists]);

  // Parse the current query for create mode
  const parsedQuery = useMemo(() => parseListQuery(searchQuery), [searchQuery]);
  const generatedTitle = useMemo(
    () => searchQuery.trim() ? generateListTitle(parsedQuery) : "",
    [parsedQuery, searchQuery]
  );

  // Client-side filtered lists (used when no domain filter is active)
  const filteredLists = useMemo(() => {
    if (isCreateCommand || filterDomain) return [];
    return searchLists(allLists, searchQuery, categoryFilter).slice(0, 8);
  }, [allLists, searchQuery, categoryFilter, isCreateCommand, filterDomain]);

  // Determine which results to show: API results when domain filter active or query present, else client-side
  const hasApiResults = apiResults.length > 0;
  const useApiSearch = filterDomain || (searchQuery.trim() && hasApiResults);

  // Get suggestions based on query (for create mode)
  const createSuggestions = useMemo(() => {
    if (!isCreateCommand) return [];

    if (!searchQuery.trim()) {
      return getExampleQueries();
    }

    const suggestions: string[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    if (!lowerQuery.includes("top") && !lowerQuery.includes("best")) {
      suggestions.push(`top 10 ${searchQuery}`);
      suggestions.push(`top 25 ${searchQuery}`);
    }

    if (parsedQuery.confidence < 0.5) {
      Object.keys(CATEGORY_CONFIG).forEach((cat) => {
        suggestions.push(`${searchQuery} ${cat.toLowerCase()}`);
      });
    }

    if (!lowerQuery.includes("all-time") && !lowerQuery.includes("2020") && !lowerQuery.includes("2024")) {
      suggestions.push(`${searchQuery} all-time`);
    }

    return suggestions.slice(0, 5);
  }, [searchQuery, parsedQuery.confidence, isCreateCommand]);

  // Calculate total items for keyboard navigation
  const totalItems = useMemo(() => {
    if (query.trim()) {
      if (isCreateCommand) {
        return createSuggestions.length + 1;
      }
      if (useApiSearch) {
        return apiResults.length + 1; // +1 for create new option
      }
      return filteredLists.length + 1;
    }
    return recentLists.length + history.length + getExampleQueries().length + Object.keys(CATEGORY_CONFIG).length;
  }, [query, isCreateCommand, createSuggestions.length, useApiSearch, apiResults.length, filteredLists.length, recentLists.length, history.length]);

  // Load recent lists from localStorage
  useEffect(() => {
    const storedLists = localStorage.getItem(RECENT_LISTS_KEY);
    if (storedLists) {
      try {
        setRecentLists(JSON.parse(storedLists).slice(0, MAX_RECENT_LISTS));
      } catch (error) {
        trackError({
          code: 'CLIENT_STORAGE_ERROR',
          category: 'client',
          severity: 'warning',
          traceId: `command-palette-parse-${Date.now()}`,
          source: 'CommandPalette',
          context: { operation: 'parseRecentLists', message: error instanceof Error ? error.message : String(error) },
        });
      }
    }
  }, []);

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

  // Read initialQuery from store for programmatic opening
  const initialQuery = useCommandPaletteStore((s) => s.initialQuery);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Seed search input from initialQuery when opened programmatically
  useEffect(() => {
    if (isOpen && initialQuery) {
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setIsCreating(false);
      setCategoryFilter(undefined);
    }
  }, [isOpen]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [apiResults]);

  // Navigate to a list
  const handleNavigateToList = useCallback((list: TopList) => {
    saveRecentList(list);
    addToHistory(query);
    setCurrentList(list);
    onClose();
    router.push(`/goat?list=${list.id}`);
  }, [saveRecentList, addToHistory, query, setCurrentList, onClose, router]);

  // Navigate to an API search result
  const handleNavigateToResult = useCallback(
    (result: SearchResult) => {
      addToHistory(query, result.domain);
      onClose();
      router.push(result.url);
    },
    [addToHistory, query, onClose, router]
  );

  // Navigate to a recent list entry
  const handleNavigateToRecentList = useCallback((entry: RecentListEntry) => {
    const fullList = allLists.find(l => l.id === entry.id);
    if (fullList) {
      handleNavigateToList(fullList);
    } else {
      onClose();
      router.push(`/goat?list=${entry.id}`);
    }
  }, [allLists, handleNavigateToList, onClose, router]);

  // Create list using the unified ListCreationService
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
    addToHistory(`new ${targetQuery}`);

    const queryParsed = parseListQuery(targetQuery);
    const colors = CATEGORY_COLORS[queryParsed.category] || CATEGORY_COLORS.Sports;

    const intent = createListIntent({
      category: queryParsed.category,
      subcategory: queryParsed.subcategory,
      size: queryParsed.hierarchy,
      timePeriod: queryParsed.timePeriod,
      selectedDecade: queryParsed.decade,
      selectedYear: queryParsed.year,
      color: colors,
      isPredefined: true,
      source: 'create',
    });

    const result = await listCreationService.createList(intent, {
      userId: tempUserId,
    });

    if (result.success && result.list) {
      const enhancedListData = {
        ...result.list,
        metadata: result.metadata,
      };

      setCurrentList(enhancedListData);
      onClose();
      router.push(`/goat?list=${result.listId}`);
    } else {
      toast({
        title: "Creation Failed",
        description: result.error || "Failed to create list",
      });
      setIsCreating(false);
    }
  }, [
    searchQuery,
    isCreating,
    isLoaded,
    tempUserId,
    addToHistory,
    setCurrentList,
    onClose,
    router,
  ]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // Stop the global document-level Escape handler from also firing — it
        // unconditionally closes the palette, so without this the "clear filter
        // first, close on second Escape" affordance was dead (Escape always closed).
        e.stopPropagation();
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
            handleCreateList();
          } else if (useApiSearch && apiResults.length > 0 && selectedIndex < apiResults.length) {
            handleNavigateToResult(apiResults[selectedIndex]);
          } else if (!useApiSearch && filteredLists.length > 0 && selectedIndex < filteredLists.length) {
            handleNavigateToList(filteredLists[selectedIndex]);
          } else {
            handleCreateList();
          }
        } else {
          if (recentLists.length > 0 && selectedIndex < recentLists.length) {
            handleNavigateToRecentList(recentLists[selectedIndex]);
          } else if (history.length > 0) {
            const historyIdx = selectedIndex - recentLists.length;
            if (historyIdx >= 0 && historyIdx < history.length) {
              setQuery(history[historyIdx].query);
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
        if (useApiSearch && apiResults.length > 0 && selectedIndex < apiResults.length) {
          setQuery(apiResults[selectedIndex].title);
        } else if (query.trim() && filteredLists.length > 0 && selectedIndex < filteredLists.length) {
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
      useApiSearch,
      apiResults,
      filteredLists,
      selectedIndex,
      totalItems,
      recentLists,
      history,
      createSuggestions,
      handleCreateList,
      handleNavigateToList,
      handleNavigateToResult,
      handleNavigateToRecentList,
    ]
  );

  // Get current category color
  const categoryColor = CATEGORY_COLORS[parsedQuery.category] || CATEGORY_COLORS.Sports;

  // Check if loading
  const isLoading = isSearchLoading || isLoadingUserLists || isLoadingFeatured;

  // Render an API search result item
  const renderSearchResult = (result: SearchResult, index: number, isSelected: boolean) => {
    const domainColor = DOMAIN_COLORS[result.domain];

    return (
      <button
        key={`${result.domain}-${result.id}`}
        onClick={() => handleNavigateToResult(result)}
        className={`w-full px-3 py-2.5 rounded-card text-left flex items-center gap-3 transition-colors group ${
          isSelected ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
        }`}
        data-testid={`command-palette-result-${index}`}
      >
        <div
          className="p-1.5 rounded-control shrink-0"
          style={{ background: `${domainColor}20` }}
        >
          <span style={{ color: domainColor }}>{DOMAIN_ICONS[result.domain]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{result.title}</span>
            {result.domain === 'lists' && result.metadata?.isUserList && (
              <span className="px-1.5 py-0.5 rounded bg-brand/20 text-brand-hover text-2xs shrink-0">
                Yours
              </span>
            )}
          </div>
          {result.subtitle && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="px-1.5 py-0.5 rounded text-2xs" style={{ background: `${domainColor}20`, color: domainColor }}>
                {DOMAIN_LABELS[result.domain]}
              </span>
              <span>{result.subtitle}</span>
            </div>
          )}
        </div>
        <Play
          className={`w-4 h-4 shrink-0 transition-colors ${
            isSelected ? "text-white" : "text-white/30 group-hover:text-slate-300"
          }`}
        />
      </button>
    );
  };

  // Render a client-side list item
  const renderListItem = (list: TopList, index: number, isSelected: boolean) => {
    const listColor = CATEGORY_COLORS[list.category] || CATEGORY_COLORS.Sports;
    const isUserList = userLists.some(l => l.id === list.id);

    return (
      <button
        key={list.id}
        onClick={() => handleNavigateToList(list)}
        className={`w-full px-3 py-2.5 rounded-card text-left flex items-center gap-3 transition-colors group ${
          isSelected
            ? "bg-white/10 text-white"
            : "text-white/70 hover:bg-white/5"
        }`}
        data-testid={`command-palette-list-${index}`}
      >
        <div
          className="p-1.5 rounded-control shrink-0"
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
              <span className="ml-2 px-1.5 py-0.5 rounded bg-brand/20 text-brand-hover text-2xs">
                Your list
              </span>
            )}
          </div>
        </div>
        <Play
          className={`w-4 h-4 shrink-0 transition-colors ${
            isSelected ? "text-white" : "text-white/30 group-hover:text-slate-300"
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
          transition={{ duration: DURATION.quick }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-dropdown flex items-start justify-center pt-[12vh]"
          onClick={onClose}
          data-testid="command-palette-backdrop"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: DURATION.quick, ease: "easeOut" }}
            className="w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="command-palette-container"
          >
            <div
              className="rounded-container overflow-hidden"
              style={{
                background: `linear-gradient(135deg, rgba(15, 20, 35, 0.98) 0%, rgba(25, 35, 55, 0.98) 100%)`,
                boxShadow: ELEVATION.modal,
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
                    placeholder="Search everything, or type 'new action movies'..."
                    className="flex-1 ml-4 bg-transparent text-white text-lg placeholder:text-white/30 focus:outline-hidden"
                    data-testid="command-palette-input"
                    disabled={isCreating}
                  />
                  {isSearchLoading && (
                    <Loader2 className="w-4 h-4 text-white/40 animate-spin mr-2" />
                  )}
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

                {/* Domain filter indicator */}
                {filterDomain && (
                  <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                    <span className="text-xs text-white/40">Filtering by:</span>
                    <span
                      className="px-2 py-1 rounded-badge text-xs font-medium flex items-center gap-1.5"
                      style={{
                        background: `${DOMAIN_COLORS[filterDomain]}20`,
                        color: DOMAIN_COLORS[filterDomain],
                      }}
                    >
                      {DOMAIN_ICONS[filterDomain]}
                      {DOMAIN_LABELS[filterDomain]}
                    </span>
                  </div>
                )}

                {/* Category / domain filter bar when empty */}
                {!query.trim() && (
                  <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs text-white/40 flex items-center gap-1.5 shrink-0">
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
                          className={`px-2.5 py-1 rounded-badge text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
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
                    <div className="w-px h-4 bg-white/10 shrink-0 mx-1" />
                    {(["lists", "items", "groups", "blueprints"] as SearchDomain[]).map((domain) => (
                      <button
                        key={domain}
                        onClick={() => setQuery(`/${domain.slice(0, -1)} `)}
                        className="px-2.5 py-1 rounded-badge text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 text-white/50 hover:text-white/80"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        {DOMAIN_ICONS[domain]}
                        <span>{DOMAIN_LABELS[domain]}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Create mode preview */}
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
                          className="p-2 rounded-control"
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
                        className="text-xs px-2 py-1 rounded-badge"
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
                {query.trim() ? (
                  <div className="p-2">
                    {isCreateCommand ? (
                      // Create mode - show suggestions
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
                                className={`w-full px-3 py-2.5 rounded-card text-left flex items-center gap-3 transition-colors ${
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
                    ) : useApiSearch ? (
                      // API search results (grouped by domain)
                      <>
                        {failedDomains.length > 0 && (
                          <div className="mx-3 mb-2 px-3 py-2 rounded-card bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/80">
                            {failedDomains.map(d => DOMAIN_LABELS[d.domain] || d.domain).join(', ')} results unavailable
                          </div>
                        )}
                        {apiResults.length > 0 ? (
                          <>
                            {apiResults.map((result, i) =>
                              renderSearchResult(result, i, selectedIndex === i)
                            )}
                          </>
                        ) : !isSearchLoading ? (
                          <div className="px-3 py-6 text-center flex flex-col items-center text-white/40">
                            <GoatMascot variant="searching" size={80} />
                            <p className="text-sm text-amber-200/70 mt-1">No results for &ldquo;{searchQuery}&rdquo;</p>
                            <p className="text-xs text-slate-500 mt-1">Try &ldquo;new {searchQuery}&rdquo; to create a list</p>
                          </div>
                        ) : null}

                        {/* Create new option */}
                        {searchQuery.trim() && (
                          <div className="border-t border-white/5 mt-2 pt-2">
                            <button
                              onClick={() => handleCreateList()}
                              className={`w-full px-3 py-2.5 rounded-card text-left flex items-center gap-3 transition-colors ${
                                selectedIndex === apiResults.length
                                  ? "bg-white/10 text-white"
                                  : "text-white/70 hover:bg-white/5"
                              }`}
                              data-testid="command-palette-create-new"
                            >
                              <div
                                className="p-1.5 rounded-control"
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
                        )}
                      </>
                    ) : (
                      // Client-side list search results
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
                            className={`w-full px-3 py-2.5 rounded-card text-left flex items-center gap-3 transition-colors ${
                              selectedIndex === filteredLists.length
                                ? "bg-white/10 text-white"
                                : "text-white/70 hover:bg-white/5"
                            }`}
                            data-testid="command-palette-create-new"
                          >
                            <div
                              className="p-1.5 rounded-control"
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
                  // Empty state - show recent lists, search history, and examples
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
                              className={`w-full px-3 py-2.5 rounded-card text-left flex items-center gap-3 transition-colors group ${
                                selectedIndex === i
                                  ? "bg-white/10 text-white"
                                  : "text-white/70 hover:bg-white/5"
                              }`}
                              data-testid={`command-palette-recent-list-${i}`}
                            >
                              <div
                                className="p-1.5 rounded-control shrink-0"
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
                                className={`w-4 h-4 shrink-0 transition-colors ${
                                  selectedIndex === i ? "text-white" : "text-white/30 group-hover:text-slate-300"
                                }`}
                              />
                            </button>
                          );
                        })}
                        <div className="border-t border-white/5 my-2" />
                      </>
                    )}

                    {/* Search History */}
                    {history.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                          <Search className="w-3 h-3" />
                          Recent Searches
                        </div>
                        {history.slice(0, 5).map((entry, i) => {
                          const idx = recentLists.length + i;
                          return (
                            <button
                              key={`history-${i}`}
                              onClick={() => setQuery(entry.query)}
                              className={`w-full px-3 py-2.5 rounded-card text-left flex items-center gap-3 transition-colors ${
                                selectedIndex === idx
                                  ? "bg-white/10 text-white"
                                  : "text-white/70 hover:bg-white/5"
                              }`}
                              data-testid={`command-palette-recent-query-${i}`}
                            >
                              <Clock className="w-4 h-4 text-white/40" />
                              <span className="flex-1">{entry.query}</span>
                              {entry.domain && (
                                <span
                                  className="px-1.5 py-0.5 rounded text-2xs"
                                  style={{
                                    background: `${DOMAIN_COLORS[entry.domain]}20`,
                                    color: DOMAIN_COLORS[entry.domain],
                                  }}
                                >
                                  {DOMAIN_LABELS[entry.domain]}
                                </span>
                              )}
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
                      const idx = recentLists.length + history.length + i;
                      return (
                        <button
                          key={`example-${i}`}
                          onClick={() => setQuery(`new ${example}`)}
                          className={`w-full px-3 py-2.5 rounded-card text-left flex items-center gap-3 transition-colors ${
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
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                      <ArrowRight className="w-3 h-3 -rotate-90" />
                    </kbd>
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">
                      <ArrowRight className="w-3 h-3 rotate-90" />
                    </kbd>
                    <span>navigate</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-2xs">
                      Enter
                    </kbd>
                    <span>{(useApiSearch && apiResults.length > 0) || filteredLists.length > 0 ? "select" : "create"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-2xs">
                      /list
                    </kbd>
                    <span>filter by type</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-2xs">
                      Esc
                    </kbd>
                    <span>close</span>
                  </div>
                </div>

                {searchQuery.trim() && !isCreateCommand && (
                  <button
                    onClick={() => handleCreateList()}
                    disabled={isCreating || !isLoaded}
                    className={`flex items-center gap-2 px-4 py-2 rounded-control font-medium text-sm transition-all ${
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
