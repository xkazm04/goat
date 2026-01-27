'use client';

/**
 * AddItemForm
 *
 * Collapsible form for manually adding items to the list.
 */

import { useState } from 'react';
import { Plus, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStudioItems } from '@/stores/studio-store';
import type { EnrichedItem } from '@/types/studio';

export function AddItemForm() {
  const { addItem } = useStudioItems();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleAdd = () => {
    if (!title.trim()) return;

    const newItem: EnrichedItem = {
      title: title.trim(),
      description: description.trim(),
      wikipedia_url: null,
      image_url: imageUrl.trim() || null,
    };

    addItem(newItem);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && title.trim()) {
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
        className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl
          text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50
          flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add Item Manually
      </button>
    );
  }

  return (
    <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Add New Item</h4>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white transition-colors"
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
          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700
            rounded-lg text-white placeholder-gray-500 text-sm
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description (optional)"
          rows={2}
          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700
            rounded-lg text-white placeholder-gray-500 text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Image URL (optional)"
          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700
            rounded-lg text-white placeholder-gray-500 text-sm
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleAdd}
          disabled={!title.trim()}
          className="flex-1"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
