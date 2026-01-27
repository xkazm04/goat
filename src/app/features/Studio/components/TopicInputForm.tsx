'use client';

/**
 * TopicInputForm
 *
 * Compact form for entering a topic and generating AI-powered list items.
 * Separates list size (Top N) from generate count for flexibility.
 * Category selection is placed next to topic input for better context.
 */

import { useState } from 'react';
import { Sparkles, Loader2, Zap, ListOrdered, Wand2, Plus, ChevronUp, ImageIcon, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStudioForm, useStudioGeneration, useStudioItems, useStudioMetadata } from '@/stores/studio-store';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/config/category-config';
import type { EnrichedItem } from '@/types/studio';

const LIST_SIZE_OPTIONS = [10, 20, 50] as const;
const GENERATE_COUNT_OPTIONS = [10, 30, 50, 70] as const;

interface FindImageResponse {
  image_url: string | null;
  suggested_title?: string | null;
}

export function TopicInputForm() {
  const { topic, listSize, generateCount, setTopic, setListSize, setGenerateCount } = useStudioForm();
  const { isGenerating, error, generateItems, clearError } = useStudioGeneration();
  const { addItem } = useStudioItems();
  const { category, setCategory } = useStudioMetadata();
  const { toast } = useToast();

  // Add item form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Can only add items manually if topic is filled
  const canAddItems = topic.trim().length > 0;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: 'Enter a topic',
        description: 'Please enter a topic to generate items for.',
      });
      return;
    }

    await generateItems();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleAddItem = async () => {
    if (!addTitle.trim() || isAddingItem) return;

    setIsAddingItem(true);

    try {
      let imageUrl: string | null = null;

      try {
        const response = await apiClient.post<FindImageResponse>(
          '/studio/find-image',
          {
            title: addTitle.trim(),
            context: addDescription.trim() || undefined,
          }
        );
        imageUrl = response.image_url;
      } catch {
        console.warn('Could not find image for:', addTitle);
      }

      const newItem: EnrichedItem = {
        title: addTitle.trim(),
        description: addDescription.trim(),
        wikipedia_url: null,
        image_url: imageUrl,
      };

      addItem(newItem);
      setAddTitle('');
      setAddDescription('');
      setShowAddForm(false);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && addTitle.trim() && !isAddingItem) {
      e.preventDefault();
      handleAddItem();
    } else if (e.key === 'Escape') {
      setShowAddForm(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Topic Input + Category - Side by Side */}
      <div className="grid grid-cols-[1fr_140px] gap-3">
        {/* Topic Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="topic-input"
            className="flex items-center gap-2 text-sm font-medium text-gray-200"
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            What do you want to rank?
          </label>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20
              rounded-lg opacity-0 group-focus-within:opacity-100 blur transition-opacity" />
            <input
              id="topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              placeholder="e.g., Best Horror Games, Top Pizza Toppings..."
              maxLength={200}
              className="relative w-full px-3 py-2.5 bg-gray-900/80 border border-gray-700/50
                rounded-lg text-white placeholder-gray-500 text-sm
                focus:outline-none focus:border-cyan-500/50
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label
            htmlFor="topic-category"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-200"
          >
            <Tag className="w-3.5 h-3.5 text-cyan-400" />
            Category
          </label>
          <select
            id="topic-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isGenerating}
            className="w-full px-2.5 py-2.5 bg-gray-900/80 border border-gray-700/50
              rounded-lg text-white text-sm appearance-none cursor-pointer
              focus:outline-none focus:border-cyan-500/50
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.25em 1.25em',
            }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List Size & Generate Count - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        {/* List Size (Top N) */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
            <ListOrdered className="w-3.5 h-3.5" />
            List Size
          </label>
          <div className="flex gap-1.5">
            {LIST_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setListSize(size)}
                disabled={isGenerating}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  listSize === size
                    ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50'
                    : 'bg-gray-800/50 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Count */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
            <Wand2 className="w-3.5 h-3.5" />
            Generate
          </label>
          <div className="flex gap-1">
            {GENERATE_COUNT_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setGenerateCount(count)}
                disabled={isGenerating}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  generateCount === count
                    ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50'
                    : 'bg-gray-800/50 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                )}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !topic.trim()}
        className="w-full h-10 text-sm font-medium
          bg-gradient-to-r from-cyan-500 to-teal-500
          hover:from-cyan-400 hover:to-teal-400
          text-white rounded-lg border-0
          shadow-md shadow-cyan-500/20 hover:shadow-cyan-400/30
          transition-all
          disabled:opacity-50 disabled:shadow-none"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Items
          </>
        )}
      </Button>

      {/* Add Item - Only available when topic is filled */}
      {canAddItems && (
        <>
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              disabled={isGenerating || isAddingItem}
              className="w-full py-2 text-xs text-gray-400 hover:text-cyan-400
                border border-dashed border-gray-700/50 hover:border-cyan-500/30
                rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add item manually
            </button>
          ) : (
            <div className="p-4 bg-gray-900/60 border border-gray-700/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" />
                  Add New Item
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Item title *"
                autoFocus
                disabled={isAddingItem}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50
                  rounded-md text-white placeholder-gray-500 text-sm
                  focus:outline-none focus:ring-1 focus:ring-cyan-500/50
                  disabled:opacity-50 transition-all"
              />
              <textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                onKeyDown={handleAddKeyDown}
                placeholder="Description (optional)"
                rows={2}
                disabled={isAddingItem}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50
                  rounded-md text-white placeholder-gray-500 text-sm resize-none
                  focus:outline-none focus:ring-1 focus:ring-cyan-500/50
                  disabled:opacity-50 transition-all"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <ImageIcon className="w-3 h-3" />
                  <span>Image auto-found via Wikipedia</span>
                </div>
                <Button
                  onClick={handleAddItem}
                  disabled={!addTitle.trim() || isAddingItem}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-500 border-0"
                >
                  {isAddingItem ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add Item
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
          <p className="text-red-400">{error}</p>
          <button
            type="button"
            onClick={clearError}
            className="text-xs text-red-300 underline mt-1 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
