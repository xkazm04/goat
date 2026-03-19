'use client';

/**
 * AddItemForm
 *
 * Collapsible form for manually adding items to the list.
 * Automatically finds images via Wikipedia/Gemini API.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronUp, Loader2, ImageIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { SURFACE_ELEVATION } from '@/components/visual/depth/depth-tokens';
import { DURATION } from '@/lib/animations/motion-presets';
import { apiClient } from '@/lib/api/client';
import { useStudioItems } from '@/stores/studio-store';

import { StudioError } from './StudioError';

import type { EnrichedItem } from '@/types/studio';

interface FindImageResponse {
  image_url: string | null;
  suggested_title?: string | null;
}

interface AddItemFormProps {
  /** Disable the form (e.g. during generation) */
  disabled?: boolean;
}

export function AddItemForm({ disabled = false }: AddItemFormProps) {
  const { addItem } = useStudioItems();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!title.trim() || isAddingItem) return;

    setIsAddingItem(true);
    setImageError(null);

    try {
      // Find image from Wikipedia via Gemini
      let imageUrl: string | null = null;

      try {
        const response = await apiClient.post<FindImageResponse>(
          '/studio/find-image',
          {
            title: title.trim(),
            context: description.trim() || undefined,
          }
        );
        imageUrl = response.image_url;
      } catch {
        // Image search failed - still add item, but show notice
        setImageError(`Couldn't find an image for "${title.trim()}" — you can add one later`);
      }

      const newItem: EnrichedItem = {
        title: title.trim(),
        description: description.trim(),
        wikipedia_url: null,
        image_url: imageUrl,
      };

      addItem(newItem);
      setTitle('');
      setDescription('');
      setIsExpanded(false);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && title.trim() && !isAddingItem) {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!isExpanded ? (
        <motion.button
          key="collapsed"
          type="button"
          onClick={() => setIsExpanded(true)}
          disabled={disabled}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.quick }}
          className="w-full p-4 border-2 border-dashed border-gray-700/50 rounded-card
            text-gray-400 hover:text-amber-400 hover:border-amber-500/50
            hover:bg-amber-500/5 flex items-center justify-center gap-2
            transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Add Item Manually
        </motion.button>
      ) : (
        <motion.div
          key="expanded"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: DURATION.quick, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="p-4 bg-linear-to-br from-gray-900/80 to-gray-900/40
            border border-gray-700/50 rounded-card space-y-4 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                Add New Item
              </h4>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition-colors p-1
                  hover:bg-white/5 rounded-control"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Item title *"
                autoFocus
                disabled={isAddingItem}
                className="w-full px-4 py-2.5 border border-gray-700/50
                  rounded-control text-white placeholder-gray-500 text-sm
                  focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50
                  disabled:opacity-50 transition-all"
                style={{ backgroundColor: SURFACE_ELEVATION.raised }}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Description (optional)"
                rows={2}
                disabled={isAddingItem}
                className="w-full px-4 py-2.5 border border-gray-700/50
                  rounded-control text-white placeholder-gray-500 text-sm resize-none
                  focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50
                  disabled:opacity-50 transition-all"
                style={{ backgroundColor: SURFACE_ELEVATION.raised }}
              />

              {/* Image info */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image will be found automatically from Wikipedia</span>
              </div>
            </div>

            {/* Image lookup error */}
            <AnimatePresence>
              {imageError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DURATION.quick }}
                >
                  <StudioError
                    message={imageError}
                    compact
                    onDismiss={() => setImageError(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={!title.trim() || isAddingItem}
                className="flex-1 bg-amber-500/15 hover:bg-amber-500/25
                  text-amber-400 hover:text-amber-300
                  border border-amber-500/30 hover:border-amber-500/50"
              >
                {isAddingItem ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Finding image...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsExpanded(false)}
                disabled={isAddingItem}
                className="border-gray-700 hover:opacity-80"
              >
                Cancel
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
