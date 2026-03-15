'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronUp, Loader2, Sparkles } from 'lucide-react';
import { topItemsApi } from '@/lib/api/top-items';
import { apiClient } from '@/lib/api/client';
import { useBacklogStore } from '@/stores/backlog-store';
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

export function AddCustomItemForm({ category, subcategory, groupId }: AddCustomItemFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addItemToGroup = useBacklogStore(state => state.addItemToGroup);
  const updateItemInGroup = useBacklogStore(state => state.updateItemInGroup);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Step 1: Create item via API
      const created = await topItemsApi.createItem({
        name: name.trim(),
        category,
        subcategory,
        group_id: groupId,
      });

      // Step 2: Add to backlog store immediately (with minimal data)
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

      // Reset form
      setName('');
      setIsExpanded(false);

      // Step 3: Trigger enrichment asynchronously
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
        // Enrichment failure is non-blocking - item was already added
      } finally {
        setEnrichingId(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create item';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [name, isSubmitting, category, subcategory, groupId, addItemToGroup, updateItemInGroup]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && name.trim() && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      setError(null);
    }
  }, [name, isSubmitting, handleSubmit]);

  return (
    <div className="px-2 pb-1.5 shrink-0">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.button
            key="trigger"
            type="button"
            onClick={() => { setIsExpanded(true); setError(null); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="w-full py-1.5 px-3 border border-dashed border-white/10 rounded-lg
              text-slate-500 hover:text-brand-hover hover:border-brand/30
              hover:bg-brand/5 flex items-center justify-center gap-1.5
              transition-all duration-200 text-xs group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            Add Custom Item
          </motion.button>
        ) : (
          <motion.div
            key="form"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="py-1.5 px-2 bg-white/[0.03] border border-white/10 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Plus className="w-3 h-3 text-brand-hover" />
                  New Item
                </span>
                <button
                  type="button"
                  onClick={() => { setIsExpanded(false); setError(null); }}
                  className="text-slate-500 hover:text-white transition-colors p-0.5
                    hover:bg-white/5 rounded"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Item name..."
                  autoFocus
                  disabled={isSubmitting}
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-black/20 border border-white/10
                    rounded-md text-white placeholder-slate-600 text-xs
                    focus:outline-none focus:ring-1 focus:ring-brand/40 focus:border-brand/30
                    disabled:opacity-50 transition-all"
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!name.trim() || isSubmitting}
                  className="px-2.5 py-1.5 bg-brand/15 hover:bg-brand/25
                    text-brand-hover hover:text-brand-hover border border-brand/25
                    hover:border-brand/40 rounded-md text-xs font-medium
                    disabled:opacity-40 disabled:cursor-not-allowed transition-all
                    flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  Add
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400/80 px-0.5">{error}</p>
              )}

              <p className="text-xs text-slate-600 px-0.5 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Image & details auto-enriched
              </p>
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
