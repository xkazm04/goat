'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronUp, Loader2, Sparkles, Search, Check, X, LogIn } from 'lucide-react';
import { useState, useRef } from 'react';

import { useAuthUser } from '@/hooks/use-auth-user';
import { DURATION } from '@/lib/animations/motion-presets';
import { apiClient } from '@/lib/api/client';
import { topItemsApi, type TopItem } from '@/lib/api/top-items';
import { useBacklogStore } from '@/stores/backlog-store';
import { useCurrentList } from '@/stores/use-list-store';

import type { BacklogItem } from '@/types/backlog-groups';


interface AddCustomItemFormProps {
  category: string;
  subcategory?: string;
  /** Group ID to add the item to (first available group) */
  groupId: string;
}

interface EnrichmentResponse {
  success: boolean;
  data?: {
    name: string;
    description?: string;
    year?: number;
    yearEnd?: number;
    selectedImage?: { url: string };
    genres?: string[];
  };
}

type FormStep = 'closed' | 'search' | 'results' | 'not-found' | 'creating';

/**
 * AddCustomItemForm - Search-first UX for adding custom items to backlog.
 *
 * Flow: Search → Show results → User accepts found item OR creates new → Added to backlog
 *
 * Guards:
 * - Only visible when list.allow_custom_items is true (or undefined = default true)
 * - Only visible for signed-in users
 */
export function AddCustomItemForm({ category, subcategory, groupId }: AddCustomItemFormProps) {
  const [step, setStep] = useState<FormStep>('closed');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TopItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addItemToGroup = useBacklogStore(state => state.addItemToGroup);
  const updateItemInGroup = useBacklogStore(state => state.updateItemInGroup);

  // Auth check
  const { isAuthenticated, isGuest, signInWithGoogle } = useAuthUser();

  // List config check
  const currentList = useCurrentList();
  const allowCustomItems = currentList?.allow_custom_items !== false; // default true

  // Don't render if list doesn't allow custom items
  if (!allowCustomItems) return null;

  // Don't render if user is not signed in - show sign-in prompt instead
  if (isGuest) {
    return (
      <div className="px-2 pb-1.5 shrink-0">
        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full py-1.5 px-3 border border-dashed border-white/10 rounded-control
            text-slate-500 hover:text-brand-hover hover:border-brand/30
            hover:bg-brand/5 flex items-center justify-center gap-1.5
            transition-all duration-200 text-xs group"
        >
          <LogIn className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          Sign in to suggest items
        </button>
      </div>
    );
  }

  const handleClose = () => {
    setStep('closed');
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await topItemsApi.searchItems({
        category,
        subcategory,
        search: query.trim(),
        limit: 5,
      });
      setSearchResults(results);
      setStep(results.length > 0 ? 'results' : 'not-found');
    } catch {
      setSearchResults([]);
      setStep('not-found');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    // Debounce search
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => handleSearch(value), 400);
    } else {
      setSearchResults([]);
      if (step === 'results' || step === 'not-found') setStep('search');
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length >= 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      handleSearch(searchQuery);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleSearchSubmit();
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  /** Accept an existing item from search results - add it to backlog */
  const handleAcceptItem = async (item: TopItem) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const newItem: BacklogItem = {
        id: item.id,
        name: item.name,
        title: item.name,
        description: item.description,
        category: item.category,
        subcategory: item.subcategory,
        item_year: item.item_year,
        image_url: item.image_url,
        created_at: item.created_at,
        tags: item.tags,
      };

      addItemToGroup(groupId, newItem);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Create a brand new item when search yields no results */
  const handleCreateNew = async () => {
    if (!searchQuery.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStep('creating');
    setError(null);

    try {
      const created = await topItemsApi.createItem({
        name: searchQuery.trim(),
        category,
        subcategory,
        group_id: groupId,
      });

      const newItem: BacklogItem = {
        id: created.id,
        name: created.name,
        title: created.name,
        description: created.description,
        category: created.category,
        subcategory: created.subcategory,
        item_year: created.item_year,
        image_url: created.image_url,
        created_at: created.created_at,
        tags: created.tags,
      };

      addItemToGroup(groupId, newItem);
      handleClose();

      // Async enrichment
      setEnrichingId(created.id);
      try {
        const enrichResult = await apiClient.post<EnrichmentResponse>('/items/enrich', {
          name: created.name,
          category,
          subcategory,
        });

        if (enrichResult.success && enrichResult.data) {
          const data = enrichResult.data;
          const updates: Partial<BacklogItem> = {};
          if (data.description) updates.description = data.description;
          if (data.year) updates.item_year = data.year;
          if (data.yearEnd) updates.item_year_to = data.yearEnd;
          if (data.selectedImage?.url) updates.image_url = data.selectedImage.url;
          if (Object.keys(updates).length > 0) {
            updateItemInGroup(groupId, created.id, updates);
          }
        }
      } catch {
        // Enrichment failure is non-blocking
      } finally {
        setEnrichingId(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      setError(message);
      setStep('not-found');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-2 pb-1.5 shrink-0">
      <AnimatePresence mode="wait">
        {step === 'closed' ? (
          <motion.button
            key="trigger"
            type="button"
            onClick={() => {
              setStep('search');
              setError(null);
              // Focus input after animation
              setTimeout(() => inputRef.current?.focus(), 150);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.instant }}
            className="w-full py-1.5 px-3 border border-dashed border-white/10 rounded-control
              text-slate-500 hover:text-brand-hover hover:border-brand/30
              hover:bg-brand/5 flex items-center justify-center gap-1.5
              transition-all duration-200 text-xs group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            Suggest Item
          </motion.button>
        ) : (
          <motion.div
            key="form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.quick, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="py-1.5 px-2 bg-white/[0.03] border border-white/10 rounded-card space-y-1.5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Search className="w-3 h-3 text-brand-hover" />
                  Search for item
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-slate-500 hover:text-white transition-colors p-0.5 hover:bg-white/5 rounded"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>

              {/* Search input */}
              <div className="flex gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Search ${category} items...`}
                  autoFocus
                  disabled={isSubmitting}
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-black/20 border border-white/10
                    rounded-control text-white placeholder-slate-600 text-xs
                    focus:outline-none focus:ring-1 focus:ring-brand/40 focus:border-brand/30
                    disabled:opacity-50 transition-all"
                />
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  disabled={searchQuery.trim().length < 2 || isSearching}
                  className="px-2.5 py-1.5 bg-brand/15 hover:bg-brand/25
                    text-brand-hover border border-brand/25 hover:border-brand/40
                    rounded-control text-xs font-medium disabled:opacity-40
                    disabled:cursor-not-allowed transition-all flex items-center gap-1"
                >
                  {isSearching ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Search Results */}
              {step === 'results' && searchResults.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                  <p className="text-xs text-slate-500 px-0.5">
                    Found {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}
                  </p>
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleAcceptItem(item)}
                      disabled={isSubmitting}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-control
                        bg-white/[0.02] hover:bg-brand/10 border border-transparent
                        hover:border-brand/20 transition-all group text-left"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-7 h-7 rounded object-cover shrink-0 bg-white/5"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-white/5 shrink-0 flex items-center justify-center text-white/20 text-3xs">
                          ?
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-slate-300 group-hover:text-white truncate block">
                          {item.name}
                        </span>
                        {item.item_year && (
                          <span className="text-2xs text-slate-500">{item.item_year}</span>
                        )}
                      </div>
                      <Check className="w-3.5 h-3.5 text-brand-hover opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Not Found - offer to create new */}
              {step === 'not-found' && !isSearching && searchQuery.trim() && (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 px-0.5 flex items-center gap-1">
                    <X className="w-3 h-3 text-slate-600" />
                    No match for &ldquo;{searchQuery.trim()}&rdquo; in {category}
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    disabled={isSubmitting}
                    className="w-full py-1.5 px-3 bg-brand/10 hover:bg-brand/20
                      text-brand-hover border border-brand/20 hover:border-brand/30
                      rounded-control text-xs font-medium transition-all
                      disabled:opacity-40 disabled:cursor-not-allowed
                      flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Create &ldquo;{searchQuery.trim()}&rdquo; as new item
                  </button>
                </div>
              )}

              {/* Creating state */}
              {step === 'creating' && (
                <div className="flex items-center gap-1.5 text-xs text-brand-hover/60 px-0.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Creating item...
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs text-red-400/80 px-0.5">{error}</p>
              )}

              {/* Hint */}
              {step === 'search' && !isSearching && searchResults.length === 0 && (
                <p className="text-xs text-slate-600 px-0.5 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Search existing items first, then create if not found
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enrichment indicator */}
      <AnimatePresence>
        {enrichingId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1 flex items-center gap-1.5 text-xs text-brand-hover/60 px-1"
          >
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            Enriching item data...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
