'use client';

/**
 * TopicInputForm
 *
 * Two-phase form for list creation:
 * Phase 1 (Hero): Single "What do you want to rank?" input with generate button
 * Phase 2 (Expanded): Full form with all fields, pre-filled by LLM where possible
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, ListOrdered, Wand2, Tag, FileText, Type, CheckCircle2, Crown, LayoutTemplate, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { UniversalSelect } from '@/components/ui/universal-select';
import { INSET } from '@/components/visual/depth/depth-tokens';
import { useToast } from '@/hooks/use-toast';
import { DURATION } from '@/lib/animations/motion-presets';
import { CATEGORIES } from '@/lib/config/category-config';
import { cn } from '@/lib/utils';
import { useStudioForm, useStudioGeneration, useStudioMetadata, useStudioValidation, useStudioTemplate } from '@/stores/studio-store';

import { AddItemForm } from './AddItemForm';
import { StudioError } from './StudioError';
import { TemplateGallery } from './TemplateGallery';

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

// Animation variants
const expandVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0, overflow: 'hidden' as const },
  visible: {
    opacity: 1,
    height: 'auto',
    marginTop: 24,
    overflow: 'visible' as const,
    transition: { duration: DURATION.slow, ease: [0.23, 1, 0.32, 1] as [number, number, number, number], staggerChildren: 0.06 },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    overflow: 'hidden' as const,
    transition: { duration: DURATION.normal },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.normal } },
};

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
  const { applyTemplate } = useStudioTemplate();
  const { toast } = useToast();
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Phase 2 triggers: has generated items, or is currently generating, or user expanded manually
  const hasGenerated = itemCount > 0;
  const isExpanded = hasGenerated || isGenerating || showAdvanced;

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
    <div className="space-y-0">
      {/* ── Phase 1: Hero Input ── */}
      <div className="relative">
        {/* Ambient glow behind input */}
        <div
          className="absolute -inset-4 rounded-3xl opacity-60 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.06) 0%, transparent 70%)',
          }}
        />

        {/* Hero label */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-5"
          >
            <h2 className="text-xl font-bold text-white/90 tracking-tight">
              What do you want to rank?
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter any topic and AI will generate items for your list
            </p>
          </motion.div>
        )}

        {/* Main input row */}
        <div className={cn(
          'relative flex gap-3',
          isExpanded ? 'items-end' : 'items-center',
        )}>
          {/* Topic Input */}
          <div className={cn('flex-1', isExpanded && 'space-y-1.5')}>
            {isExpanded && (
              <label
                htmlFor="topic-input"
                className="flex items-center gap-2 text-sm font-medium text-gray-300"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Topic
              </label>
            )}
            <div className="relative group">
              {/* Focus glow ring */}
              <div
                className="absolute -inset-px rounded-card opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.15), rgba(251,191,36,0.3))',
                }}
              />
              <input
                id="topic-input"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isGenerating}
                placeholder={isExpanded ? 'e.g., Best Horror Games...' : 'Best Horror Games, Top Pizza Toppings...'}
                maxLength={200}
                autoFocus
                data-testid="studio-topic-input"
                className={cn(
                  'relative w-full rounded-card text-white placeholder-gray-500',
                  'focus:outline-hidden transition-all duration-300',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'border border-gray-700/50 focus:border-amber-500/40',
                  'bg-gray-900/60 backdrop-blur-sm',
                  isExpanded
                    ? 'px-3 py-2.5 text-sm'
                    : 'px-5 py-4 text-base',
                  topic.trim() && 'border-amber-500/20',
                )}
              />
            </div>
          </div>

          {/* Category pill (compact, shown inline when expanded) */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-[140px] space-y-1.5"
            >
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                Category
              </label>
              <UniversalSelect
                value={category}
                onChange={setCategory}
                options={CATEGORY_OPTIONS}
                disabled={isGenerating}
                size="md"
                data-testid="studio-category-select"
              />
            </motion.div>
          )}

          {/* Generate button */}
          <motion.div
            layout
            className={cn(isExpanded ? 'self-end' : '')}
          >
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className={cn(
                'relative font-semibold whitespace-nowrap',
                'rounded-card border transition-all duration-300',
                'disabled:opacity-40',
                isExpanded
                  ? 'h-[42px] px-5 text-sm'
                  : 'h-[52px] px-7 text-base',
                isGenerating
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300 hover:from-amber-500/30 hover:to-orange-500/30 hover:border-amber-500/60 hover:text-amber-200',
              )}
              data-testid="studio-generate-btn"
              style={
                !isGenerating && topic.trim()
                  ? { boxShadow: '0 0 20px rgba(251,191,36,0.15), 0 0 40px rgba(251,191,36,0.05)' }
                  : undefined
              }
            >
              {/* Animated glow sweep on hover */}
              {!isGenerating && topic.trim() && (
                <div className="absolute inset-0 rounded-card overflow-hidden pointer-events-none">
                  <div className="absolute inset-0 animate-shimmer-slow"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(251,191,36,0.08) 50%, transparent 60%)',
                      backgroundSize: '200% 100%',
                    }}
                  />
                </div>
              )}
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <Crown className="w-4 h-4 animate-pulse text-amber-300" />
                  <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                    {generationProgress || 'Generating...'}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {itemCount > 0 ? 'Generate More' : 'Generate'}
                </span>
              )}
            </Button>
          </motion.div>
        </div>

        {/* Generation progress bar */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 h-1 rounded-full overflow-hidden bg-gray-800/50"
            >
              <div className="h-full rounded-full animate-progress-sweep"
                style={{
                  background: 'linear-gradient(90deg, rgba(251,191,36,0.3), rgba(245,158,11,0.6), rgba(251,191,36,0.3))',
                  backgroundSize: '200% 100%',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick actions row (when not expanded) */}
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: DURATION.fast }}
            className="flex items-center justify-center gap-4 mt-4"
          >
            <button
              type="button"
              onClick={() => setShowTemplates(true)}
              disabled={isGenerating}
              data-testid="studio-browse-templates-btn"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-400 transition-colors"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              Browse Templates
            </button>
            <span className="w-px h-3 bg-gray-700/50" />
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              disabled={isGenerating}
              data-testid="studio-advanced-options-btn"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Advanced Options
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Phase 2: Expanded Form ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={expandVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-5"
          >
            {/* List Title & Description */}
            <motion.div variants={fieldVariants} className="grid grid-cols-[1fr_1fr] gap-3">
              {/* List Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="list-title"
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-400"
                >
                  <Type className="w-3.5 h-3.5" />
                  List Title <span className="text-red-400/70">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5
                    rounded-control opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                    style={{ boxShadow: INSET.focusGlow }} />
                  <div className="relative flex items-center gap-1.5">
                    <input
                      id="list-title"
                      type="text"
                      value={listTitle}
                      onChange={(e) => setListTitle(e.target.value)}
                      placeholder="Auto-filled by AI..."
                      maxLength={100}
                      disabled={isGenerating}
                      data-testid="studio-list-title-input"
                      className={cn(
                        'flex-1 px-2.5 py-2 bg-gray-900/60 rounded-control text-white placeholder-gray-500 text-sm',
                        'focus:outline-hidden focus:ring-1',
                        'disabled:opacity-50 transition-all',
                        itemCount > 0 && !listTitle.trim()
                          ? 'border border-red-500/50 focus:ring-red-500/50'
                          : itemCount > 0 && listTitle.trim()
                          ? 'border border-green-500/30 focus:ring-green-500/50'
                          : 'border border-gray-700/50 focus:ring-amber-500/50'
                      )}
                    />
                    {itemCount > 0 && listTitle.trim() && (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    )}
                    {topic && !listTitle && (
                      <button
                        type="button"
                        onClick={suggestTitleFromTopic}
                        title="Use topic as title"
                        disabled={isGenerating}
                        data-testid="studio-suggest-title-btn"
                        className="p-2 bg-gray-900/60 border border-gray-700/50 rounded-control
                          text-gray-400 hover:text-amber-400 hover:border-amber-500/30
                          disabled:opacity-50 transition-all"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-0.5">
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
                    rounded-control opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                    style={{ boxShadow: INSET.focusGlow }} />
                  <input
                    id="list-description"
                    type="text"
                    value={listDescription}
                    onChange={(e) => setListDescription(e.target.value)}
                    placeholder="Auto-filled by AI..."
                    maxLength={200}
                    disabled={isGenerating}
                    data-testid="studio-list-description-input"
                    className="relative w-full px-2.5 py-2 bg-gray-900/60 border border-gray-700/50
                      rounded-control text-white placeholder-gray-500 text-sm
                      focus:outline-hidden focus:ring-1 focus:ring-amber-500/50
                      disabled:opacity-50 transition-all"
                  />
                </div>
                <div className="flex justify-end mt-0.5">
                  <CharacterCounter current={listDescription.length} max={200} />
                </div>
              </div>
            </motion.div>

            {/* List Size & Generate Count */}
            <motion.div variants={fieldVariants} className="grid grid-cols-2 gap-3">
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
                      data-testid={`studio-list-size-${size}`}
                      className={cn(
                        'flex-1 py-1.5 rounded-control text-xs font-medium transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        listSize === size
                          ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.1)]'
                          : 'bg-gray-800/60 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                      )}
                    >
                      Top {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Count */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                  <Wand2 className="w-3.5 h-3.5" />
                  Items to Generate
                </label>
                <div className="flex gap-1">
                  {GENERATE_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setGenerateCount(count)}
                      disabled={isGenerating}
                      data-testid={`studio-generate-count-${count}`}
                      className={cn(
                        'flex-1 py-1.5 rounded-control text-xs font-medium transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        generateCount === count
                          ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.1)]'
                          : 'bg-gray-800/60 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50'
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Template + Collapse row */}
            <motion.div variants={fieldVariants} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                disabled={isGenerating}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-control text-xs font-medium',
                  'border border-dashed border-gray-700/50 hover:border-amber-500/30',
                  'text-gray-500 hover:text-amber-400 transition-all',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'hover:bg-amber-500/5'
                )}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                Templates
              </button>
              {!hasGenerated && !isGenerating && (
                <button
                  type="button"
                  onClick={() => setShowAdvanced(false)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Collapse
                </button>
              )}
            </motion.div>

            {/* Add Item - Only available when topic is filled */}
            {canAddItems && (
              <motion.div variants={fieldVariants}>
                <AddItemForm disabled={isGenerating} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.quick }}
            className="mt-4"
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

      {/* Template Gallery Modal */}
      <TemplateGallery
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(templateId) => {
          applyTemplate(templateId);
          setShowAdvanced(true);
          toast({
            title: 'Template applied',
            description: 'Starter items loaded. Generate more to fill the list!',
          });
        }}
      />
    </div>
  );
}
