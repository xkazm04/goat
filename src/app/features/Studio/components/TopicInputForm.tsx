'use client';

/**
 * TopicInputForm
 *
 * Form for entering a topic and generating AI-powered list items.
 * Includes topic input, item count selection, and generate button.
 */

import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStudioForm, useStudioGeneration } from '@/stores/studio-store';
import { cn } from '@/lib/utils';

const COUNT_OPTIONS = [10, 20, 50] as const;

export function TopicInputForm() {
  const { topic, itemCount, setTopic, setItemCount } = useStudioForm();
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
    <div className="space-y-6">
      {/* Topic Input */}
      <div className="space-y-2">
        <label
          htmlFor="topic-input"
          className="text-sm font-medium text-gray-300"
        >
          What do you want to rank?
        </label>
        <input
          id="topic-input"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
          placeholder="e.g., Top 10 Action Movies, Best Pizza Toppings..."
          maxLength={200}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700
            rounded-xl text-white placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200"
        />
        <p className="text-xs text-gray-500">{topic.length}/200 characters</p>
      </div>

      {/* Item Count Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">
          Number of items
        </label>
        <div className="flex gap-2">
          {COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setItemCount(count)}
              disabled={isGenerating}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                itemCount === count
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600'
              )}
            >
              Top {count}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !topic.trim()}
        className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-500
          hover:from-cyan-400 hover:to-blue-400
          text-white font-medium rounded-xl
          shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40
          transition-all duration-300 disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Items
          </>
        )}
      </Button>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
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
