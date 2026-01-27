'use client';

/**
 * TopicInputForm
 *
 * Premium form for entering a topic and generating AI-powered list items.
 * Features gradient styling, glow effects, and smooth transitions.
 */

import { Sparkles, Loader2, Zap } from 'lucide-react';
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
      <div className="space-y-3">
        <label
          htmlFor="topic-input"
          className="flex items-center gap-2 text-sm font-medium text-gray-200"
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          What do you want to rank?
        </label>
        <div className="relative group">
          {/* Glow effect on focus */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20
            rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity" />

          <input
            id="topic-input"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="e.g., Best Horror Games, Top Pizza Toppings, Greatest Albums..."
            maxLength={200}
            className="relative w-full px-4 py-4 bg-gray-900/80 border border-gray-700/50
              rounded-xl text-white placeholder-gray-500 text-base
              focus:outline-none focus:border-cyan-500/50
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300"
          />
        </div>
        <p className="text-xs text-gray-500 flex items-center justify-between">
          <span>Be specific for better results</span>
          <span className={cn(
            'transition-colors',
            topic.length > 150 ? 'text-amber-400' : 'text-gray-500'
          )}>
            {topic.length}/200
          </span>
        </p>
      </div>

      {/* Item Count Selection */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
          <span>Number of items to generate</span>
        </label>
        <div className="flex gap-3">
          {COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setItemCount(count)}
              disabled={isGenerating}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'border-2',
                itemCount === count
                  ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                  : 'bg-gray-900/50 text-gray-400 border-gray-700/50 hover:border-gray-600 hover:text-gray-300'
              )}
            >
              Top {count}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="relative group pt-2">
        {/* Button glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 to-blue-500/30
          rounded-2xl opacity-75 group-hover:opacity-100 blur-xl transition-opacity" />

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="relative w-full h-14 text-base font-semibold
            bg-gradient-to-r from-cyan-500 to-blue-500
            hover:from-cyan-400 hover:to-blue-400
            text-white rounded-xl border-0
            shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40
            transition-all duration-300
            disabled:opacity-50 disabled:shadow-none"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating with AI...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Items
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl
          backdrop-blur-sm">
          <p className="text-sm text-red-400">{error}</p>
          <button
            type="button"
            onClick={clearError}
            className="text-xs text-red-300 underline mt-2 hover:text-red-200
              transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
