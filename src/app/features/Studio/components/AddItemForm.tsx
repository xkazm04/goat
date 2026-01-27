'use client';

/**
 * AddItemForm
 *
 * Collapsible form for manually adding items to the list.
 * Automatically finds images via Wikipedia/Gemini API.
 */

import { useState } from 'react';
import { Plus, ChevronUp, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudioItems } from '@/stores/studio-store';
import { apiClient } from '@/lib/api/client';
import type { EnrichedItem } from '@/types/studio';

interface FindImageResponse {
  image_url: string | null;
  suggested_title?: string | null;
}

export function AddItemForm() {
  const { addItem } = useStudioItems();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  const handleAdd = async () => {
    if (!title.trim() || isAddingItem) return;

    setIsAddingItem(true);

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
        // Image search is optional, continue without image
        console.warn('Could not find image for:', title);
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

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="w-full p-4 border-2 border-dashed border-gray-700/50 rounded-xl
          text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50
          hover:bg-cyan-500/5 flex items-center justify-center gap-2
          transition-all duration-300 group"
      >
        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
        Add Item Manually
      </button>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-gray-900/80 to-gray-900/40
      border border-gray-700/50 rounded-xl space-y-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-cyan-400" />
          Add New Item
        </h4>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white transition-colors p-1
            hover:bg-white/5 rounded-lg"
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
          className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700/50
            rounded-lg text-white placeholder-gray-500 text-sm
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
            disabled:opacity-50 transition-all"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description (optional)"
          rows={2}
          disabled={isAddingItem}
          className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700/50
            rounded-lg text-white placeholder-gray-500 text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
            disabled:opacity-50 transition-all"
        />

        {/* Image info */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Image will be found automatically from Wikipedia</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleAdd}
          disabled={!title.trim() || isAddingItem}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500
            hover:from-cyan-500 hover:to-cyan-400 border-0"
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
          className="border-gray-700 hover:bg-gray-800/50"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
