'use client';

/**
 * TopicInputForm
 *
 * Compact form for entering a topic and generating AI-powered list items.
 * Separates list size (Top N) from generate count for flexibility.
 */

import { Sparkles, Loader2, Zap, ListOrdered, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStudioForm, useStudioGeneration } from '@/stores/studio-store';
import { cn } from '@/lib/utils';

const LIST_SIZE_OPTIONS = [10, 20, 50] as const;
const GENERATE_COUNT_OPTIONS = [10, 15, 20, 25, 30] as const;

export function TopicInputForm() {
  const { topic, listSize, generateCount, setTopic, setListSize, setGenerateCount } = useStudioForm();
  const { isGenerating, error, generateItems, clearError } = useStudioGeneration();
  const { toast } = useToast();

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
    <div className="space-y-4">
      {/* Topic Input */}
      <div className="space-y-2">
        <label
          htmlFor="topic-input"
          className="flex items-center gap-2 text-sm font-medium text-gray-200"
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          What do you want to rank?
        </label>
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20
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
                    ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50'
                    : 'bg-gray-800/50 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                )}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button - Compact */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !topic.trim()}
        className="w-full h-10 text-sm font-medium
          bg-gradient-to-r from-cyan-500 to-blue-500
          hover:from-cyan-400 hover:to-blue-400
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
