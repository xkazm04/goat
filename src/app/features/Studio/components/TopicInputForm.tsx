'use client';

/**
 * TopicInputForm
 *
 * Main form for list creation including topic, category, title, description,
 * list size, and generate count. All core fields in one place.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Zap, ListOrdered, Wand2, Tag, FileText, Type, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalSelect } from '@/components/ui/universal-select';
import { useToast } from '@/hooks/use-toast';
import { SURFACE_ELEVATION, INSET } from '@/components/visual/depth/depth-tokens';
import { useStudioForm, useStudioGeneration, useStudioMetadata, useStudioValidation } from '@/stores/studio-store';
import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/lib/config/category-config';
import { StudioError } from './StudioError';
import { AddItemForm } from './AddItemForm';

/**
 * Character counter component showing current/max with color-coded limits
 */
function CharacterCounter({ current, max, className }: {
  current: number;
  max: number;
  className?: string;
}) {
  const isNearLimit = current > max * 0.8;
  const isAtLimit = current >= max;
  return (
    <span className={cn(
      'text-xs transition-colors duration-200',
      isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-gray-500',
      className
    )}>
      {current}/{max}
    </span>
  );
}

// Category options for the select
const CATEGORY_OPTIONS = CATEGORIES.map(cat => ({
  value: cat,
  label: cat,
}));

const LIST_SIZE_OPTIONS = [10, 20, 50] as const;
const GENERATE_COUNT_OPTIONS = [10, 30, 50, 70] as const;

export function TopicInputForm() {
  const { topic, listSize, generateCount, setTopic, setListSize, setGenerateCount } = useStudioForm();
  const { isGenerating, generationProgress, error, generateItems, clearError } = useStudioGeneration();
  const { itemCount } = useStudioValidation();
  const {
    category,
    setCategory,
    listTitle,
    listDescription,
    setListTitle,
    setListDescription,
    suggestTitleFromTopic,
  } = useStudioMetadata();
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      {/* Topic Input + Category - Side by Side */}
      <div className="grid grid-cols-[1fr_140px] gap-3">
        {/* Topic Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="topic-input"
            className="flex items-center gap-2 text-sm font-medium text-gray-200"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            What do you want to rank?
          </label>
          <div className="relative group">
            <div className="absolute -inset-0.5
              rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
              style={{ boxShadow: INSET.focusGlow }} />
            <input
              id="topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGenerating}
              placeholder="e.g., Best Horror Games, Top Pizza Toppings..."
              maxLength={200}
              className={cn(
                'relative w-full px-3 py-2.5 rounded-lg text-white placeholder-gray-500 text-sm',
                'focus:outline-hidden focus:border-amber-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-all',
                // Validation states
                topic.trim()
                  ? 'border border-green-500/20'  // Has content - subtle success
                  : 'border border-gray-700/50'   // Empty - neutral
              )}
              style={{ backgroundColor: SURFACE_ELEVATION.raised }}
            />
          </div>
          <div className="flex justify-end mt-1">
            <CharacterCounter current={topic.length} max={200} />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-200">
            <Tag className="w-3.5 h-3.5 text-gray-400" />
            Category
          </label>
          <UniversalSelect
            value={category}
            onChange={setCategory}
            options={CATEGORY_OPTIONS}
            disabled={isGenerating}
            size="md"
          />
        </div>
      </div>

      {/* List Title & Description - Side by Side */}
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        {/* List Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="list-title"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400"
          >
            <Type className="w-3.5 h-3.5" />
            List Title <span className="text-red-400">*</span>
          </label>
          <div className="relative group">
            <div className="absolute -inset-0.5
              rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
              style={{ boxShadow: INSET.focusGlow }} />
            <div className="relative flex items-center gap-1.5">
              <input
                id="list-title"
                type="text"
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                placeholder="My Awesome List"
                maxLength={100}
                disabled={isGenerating}
                className={cn(
                  'flex-1 px-2.5 py-2 bg-gray-900/60 rounded-md text-white placeholder-gray-500 text-sm',
                  'focus:outline-hidden focus:ring-1',
                  'disabled:opacity-50 transition-all',
                  // Validation states based on items existence
                  itemCount > 0 && !listTitle.trim()
                    ? 'border border-red-500/50 focus:ring-red-500/50'  // Error: items exist but no title
                    : itemCount > 0 && listTitle.trim()
                    ? 'border border-green-500/30 focus:ring-green-500/50'  // Success: title + items
                    : 'border border-gray-700/50 focus:ring-amber-500/50'   // Neutral
                )}
              />
              {/* Success checkmark when valid */}
              {itemCount > 0 && listTitle.trim() && (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              )}
              {topic && !listTitle && (
                <button
                  type="button"
                  onClick={suggestTitleFromTopic}
                  title="Use topic as title"
                  disabled={isGenerating}
                  className="p-2 bg-gray-900/60 border border-gray-700/50 rounded-md
                    text-gray-400 hover:text-amber-400 hover:border-amber-500/30
                    disabled:opacity-50 transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-1">
            <CharacterCounter current={listTitle.length} max={100} />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="list-description"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400"
          >
            <FileText className="w-3.5 h-3.5" />
            Description <span className="text-gray-600">(optional)</span>
          </label>
          <div className="relative group">
            <div className="absolute -inset-0.5
              rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
              style={{ boxShadow: INSET.focusGlow }} />
            <input
              id="list-description"
              type="text"
              value={listDescription}
              onChange={(e) => setListDescription(e.target.value)}
              placeholder="What is this list about?"
              maxLength={200}
              disabled={isGenerating}
              className="relative w-full px-2.5 py-2 bg-gray-900/60 border border-gray-700/50
                rounded-md text-white placeholder-gray-500 text-sm
                focus:outline-hidden focus:ring-1 focus:ring-amber-500/50
                disabled:opacity-50 transition-all"
            />
          </div>
          <div className="flex justify-end mt-1">
            <CharacterCounter current={listDescription.length} max={200} />
          </div>
        </div>
      </div>

      {/* List Size & Generate Count - Side by Side */}
      <div className="grid grid-cols-2 gap-3">
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
                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                )}
                style={listSize !== size ? { backgroundColor: SURFACE_ELEVATION.raised } : undefined}
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
                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                )}
                style={generateCount !== count ? { backgroundColor: SURFACE_ELEVATION.raised } : undefined}
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
        className={cn(
          'w-full h-10 text-sm font-medium',
          'bg-amber-500/15 hover:bg-amber-500/25',
          'text-amber-400 hover:text-amber-300',
          'rounded-lg border border-amber-500/30 hover:border-amber-500/50',
          'transition-all',
          'disabled:opacity-50',
          isGenerating && 'animate-pulse'
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {generationProgress || 'Generating...'}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            {itemCount > 0 ? 'Generate More' : 'Generate Items'}
          </>
        )}
      </Button>

      {/* Add Item - Only available when topic is filled */}
      {canAddItems && (
        <AddItemForm disabled={isGenerating} />
      )}

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <StudioError
              message={error}
              suggestion="Try rephrasing your topic or being more specific"
              onDismiss={clearError}
              onRetry={() => {
                clearError();
                generateItems();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
