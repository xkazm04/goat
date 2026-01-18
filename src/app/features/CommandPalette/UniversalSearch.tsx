"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  Sparkles,
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
  Film,
  FolderOpen,
  Layout,
  User,
  Loader2,
  Hash,
} from "lucide-react";
import { useQuickSearch, useSearchHistory } from "@/hooks/use-search";
import type { SearchResult, SearchDomain } from "@/lib/search";
import { parseListQuery, generateListTitle, getExampleQueries } from "./lib/parseListQuery";
import { useCreateListWithUser, useUserLists } from "@/hooks/use-top-lists";
import { useTempUser } from "@/hooks/use-temp-user";
import { useListStore } from "@/stores/use-list-store";
import { mapCompositionToCreateListRequest } from "@/types/composition-to-api";
import { toast } from "@/hooks/use-toast";
import { CATEGORY_CONFIG } from "@/lib/config/category-config";

// =============================================================================
// Constants & Configuration
// =============================================================================

const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  Sports: { primary: "#f59e0b", secondary: "#d97706", accent: "#fbbf24" },
  Music: { primary: "#8b5cf6", secondary: "#7c3aed", accent: "#a78bfa" },
  Games: { primary: "#10b981", secondary: "#059669", accent: "#34d399" },
  Stories: { primary: "#ec4899", secondary: "#db2777", accent: "#f472b6" },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Sports: <Trophy className="w-4 h-4" />,
  Music: <Music className="w-4 h-4" />,
  Games: <Gamepad2 className="w-4 h-4" />,
  Stories: <BookOpen className="w-4 h-4" />,
};

const DOMAIN_ICONS: Record<SearchDomain, React.ReactNode> = {
  lists: <List className="w-4 h-4" />,
  items: <Film className="w-4 h-4" />,
  groups: <FolderOpen className="w-4 h-4" />,
  blueprints: <Layout className="w-4 h-4" />,
  users: <User className="w-4 h-4" />,
};

const DOMAIN_LABELS: Record<SearchDomain, string> = {
  lists: "Lists",
  items: "Items",
  groups: "Collections",
  blueprints: "Blueprints",
  users: "Users",
};

const DOMAIN_COLORS: Record<SearchDomain, string> = {
  lists: "#06b6d4", // cyan
  items: "#f59e0b", // amber
  groups: "#8b5cf6", // violet
  blueprints: "#10b981", // emerald
  users: "#ec4899", // pink
};

// Domain filter prefixes (e.g., "/list batman")
const DOMAIN_FILTERS: Record<string, SearchDomain> = {
  "/list": "lists",
  "/lists": "lists",
  "/item": "items",
  "/items": "items",
  "/group": "groups",
  "/groups": "groups",
  "/collection": "groups",
  "/blueprint": "blueprints",
  "/blueprints": "blueprints",
  "/user": "users",
  "/users": "users",
};

// =============================================================================
// Types
// =============================================================================

interface UniversalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function parseDomainFilter(query: string): { domain?: SearchDomain; cleanQuery: string } {
  const lowerQuery = query.toLowerCase().trim();

  for (const [prefix, domain] of Object.entries(DOMAIN_FILTERS)) {
    if (lowerQuery.startsWith(prefix + " ") || lowerQuery === prefix) {
      return {
        domain,
        cleanQuery: query.slice(prefix.length).trim(),
      };
    }
  }

  return { cleanQuery: query };
}

function isCreateCommand(query: string): boolean {
  const lower = query.toLowerCase().trim();
  return (
    lower.startsWith("new ") ||
    lower.startsWith("create ") ||
    lower.startsWith("make ")
  );
}

function getSearchQuery(query: string): string {
  const lower = query.toLowerCase().trim();
  if (lower.startsWith("new ")) return query.slice(4);
  if (lower.startsWith("create ")) return query.slice(7);
  if (lower.startsWith("make ")) return query.slice(5);
  return query;
}

// =============================================================================
// Component
// =============================================================================

export function UniversalSearch({ isOpen, onClose }: UniversalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const createListMutation = useCreateListWithUser();
  const { history, addToHistory } = useSearchHistory();

  // Parse query for domain filter and create commands
  const { domain: filterDomain, cleanQuery } = useMemo(
    () => parseDomainFilter(query),
    [query]
  );
  const createMode = isCreateCommand(cleanQuery);
  const searchQuery = createMode ? getSearchQuery(cleanQuery) : cleanQuery;

  // Get search results
  const { results, isLoading } = useQuickSearch(searchQuery, {
    enabled: isOpen && !createMode && searchQuery.length > 0,
    domains: filterDomain ? [filterDomain] : undefined,
    limit: 12,
  });

  // Parse query for list creation
  const parsedQuery = useMemo(() => parseListQuery(searchQuery), [searchQuery]);
  const generatedTitle = useMemo(
    () => (searchQuery.trim() ? generateListTitle(parsedQuery) : ""),
    [parsedQuery, searchQuery]
  );

  // Calculate total items for navigation
  const totalItems = useMemo(() => {
    if (createMode) {
      return getExampleQueries().length + 1;
    }
    return results.length + (searchQuery.trim() ? 1 : history.length);
  }, [createMode, results.length, searchQuery, history.length]);

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
    }
  }, [isOpen]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Navigate to result
  const handleNavigateToResult = useCallback(
    (result: SearchResult) => {
      addToHistory(query, result.domain);
      onClose();
      router.push(result.url);
    },
    [addToHistory, query, onClose, router]
  );

  // Create list
  const handleCreateList = useCallback(
    async (queryOverride?: string) => {
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
    },
    [
      searchQuery,
      isCreating,
      isLoaded,
      tempUserId,
      addToHistory,
      createListMutation,
      setCurrentList,
      onClose,
      router,
    ]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();

        if (createMode) {
          handleCreateList();
        } else if (results.length > 0 && selectedIndex < results.length) {
          handleNavigateToResult(results[selectedIndex]);
        } else if (searchQuery.trim()) {
          handleCreateList();
        } else if (history.length > 0 && selectedIndex < history.length) {
          setQuery(history[selectedIndex].query);
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
        if (results.length > 0 && selectedIndex < results.length) {
          setQuery(results[selectedIndex].title);
        }
        return;
      }
    },
    [
      onClose,
      createMode,
      results,
      selectedIndex,
      searchQuery,
      history,
      totalItems,
      handleCreateList,
      handleNavigateToResult,
    ]
  );

  const categoryColor = CATEGORY_COLORS[parsedQuery.category] || CATEGORY_COLORS.Sports;

  // Render a search result item
  const renderResultItem = (result: SearchResult, index: number, isSelected: boolean) => {
    const domainColor = DOMAIN_COLORS[result.domain];

    return (
      <button
        key={`${result.domain}-${result.id}`}
        onClick={() => handleNavigateToResult(result)}
        className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors group ${
          isSelected ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
        }`}
        data-testid={`universal-search-result-${index}`}
      >
        <div
          className="p-1.5 rounded-md flex-shrink-0"
          style={{ background: `${domainColor}20` }}
        >
          <span style={{ color: domainColor }}>{DOMAIN_ICONS[result.domain]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{result.title}</span>
            {result.domain === 'lists' && result.metadata?.isUserList && (
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] flex-shrink-0">
                Yours
              </span>
            )}
          </div>
          {result.subtitle && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: `${domainColor}20`, color: domainColor }}>
                {DOMAIN_LABELS[result.domain]}
              </span>
              <span>{result.subtitle}</span>
            </div>
          )}
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
          data-testid="universal-search-backdrop"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
            data-testid="universal-search-container"
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
                    placeholder="Search everything, or type 'new action movies'..."
                    className="flex-1 ml-4 bg-transparent text-white text-lg placeholder:text-white/30 focus:outline-none"
                    data-testid="universal-search-input"
                    disabled={isCreating}
                  />
                  {isLoading && (
                    <Loader2 className="w-4 h-4 text-white/40 animate-spin mr-2" />
                  )}
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="p-1 rounded-full hover:bg-white/10 transition-colors"
                      data-testid="universal-search-clear"
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
                      className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"
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

                {/* Create mode preview */}
                {createMode && searchQuery.trim() && (
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

                {/* Quick filter buttons when empty */}
                {!query.trim() && (
                  <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
                    <span className="text-xs text-white/40 flex items-center gap-1.5 flex-shrink-0">
                      <Hash className="w-3 h-3" />
                      Filter:
                    </span>
                    {(["lists", "items", "groups", "blueprints"] as SearchDomain[]).map((domain) => (
                      <button
                        key={domain}
                        onClick={() => setQuery(`/${domain.slice(0, -1)} `)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 text-white/50 hover:text-white/80"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        {DOMAIN_ICONS[domain]}
                        <span>{DOMAIN_LABELS[domain]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Results area */}
              <div className="max-h-[50vh] overflow-y-auto">
                {query.trim() ? (
                  <div className="p-2">
                    {createMode ? (
                      // Create mode suggestions
                      <>
                        <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          Quick Create
                        </div>
                        {getExampleQueries().slice(0, 5).map((example, i) => (
                          <button
                            key={`create-${i}`}
                            onClick={() => handleCreateList(example)}
                            className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors ${
                              selectedIndex === i
                                ? "bg-white/10 text-white"
                                : "text-white/70 hover:bg-white/5"
                            }`}
                          >
                            <Plus className="w-4 h-4 text-white/40" />
                            <span>Create {example}</span>
                          </button>
                        ))}
                      </>
                    ) : results.length > 0 ? (
                      // Search results grouped by domain
                      <>
                        {results.map((result, i) => renderResultItem(result, i, selectedIndex === i))}

                        {/* Create new option */}
                        <div className="border-t border-white/5 mt-2 pt-2">
                          <button
                            onClick={() => handleCreateList()}
                            className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors ${
                              selectedIndex === results.length
                                ? "bg-white/10 text-white"
                                : "text-white/70 hover:bg-white/5"
                            }`}
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
                          </button>
                        </div>
                      </>
                    ) : (
                      // No results
                      <div className="px-3 py-6 text-center text-white/40">
                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No results for "{searchQuery}"</p>
                        <p className="text-xs mt-1">Try "new {searchQuery}" to create a list</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Empty state - show history and examples
                  <div className="p-2">
                    {history.length > 0 && (
                      <>
                        <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Recent Searches
                        </div>
                        {history.slice(0, 5).map((entry, i) => (
                          <button
                            key={`history-${i}`}
                            onClick={() => setQuery(entry.query)}
                            className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors ${
                              selectedIndex === i
                                ? "bg-white/10 text-white"
                                : "text-white/70 hover:bg-white/5"
                            }`}
                          >
                            <Clock className="w-4 h-4 text-white/40" />
                            <span className="flex-1">{entry.query}</span>
                            {entry.domain && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px]"
                                style={{
                                  background: `${DOMAIN_COLORS[entry.domain]}20`,
                                  color: DOMAIN_COLORS[entry.domain],
                                }}
                              >
                                {DOMAIN_LABELS[entry.domain]}
                              </span>
                            )}
                          </button>
                        ))}
                        <div className="border-t border-white/5 my-2" />
                      </>
                    )}

                    <div className="px-3 py-2 text-xs text-white/40 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      Quick Actions
                    </div>
                    {getExampleQueries().slice(0, 4).map((example, i) => {
                      const idx = history.length + i;
                      return (
                        <button
                          key={`example-${i}`}
                          onClick={() => setQuery(`new ${example}`)}
                          className={`w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-colors ${
                            selectedIndex === idx
                              ? "bg-white/10 text-white"
                              : "text-white/70 hover:bg-white/5"
                          }`}
                        >
                          <Plus className="w-4 h-4 text-white/40" />
                          <span>Create {example}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
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
                    <span>{results.length > 0 ? "select" : "create"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono text-[10px]">
                      /list
                    </kbd>
                    <span>filter by type</span>
                  </div>
                </div>

                {searchQuery.trim() && !createMode && (
                  <button
                    onClick={() => handleCreateList()}
                    disabled={isCreating || !isLoaded}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      isCreating ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${categoryColor.primary}, ${categoryColor.secondary})`,
                      color: "white",
                    }}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
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

export default UniversalSearch;
