'use client';

/**
 * MetadataPanel
 *
 * Premium form for configuring list metadata: title, description, category.
 * Includes publish button with validation and API integration.
 */

import { Wand2, Loader2, Settings2, Tag, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useStudioForm,
  useStudioMetadata,
  useStudioValidation,
  useStudioPublishing,
  useStudioStore,
} from '@/stores/studio-store';
import { useCreateListWithUser } from '@/hooks/use-top-lists';
import { CATEGORIES } from '@/lib/config/category-config';
import { cn } from '@/lib/utils';
import { DEFAULT_LIST_INTENT_COLOR } from '@/types/list-intent';
import type { CreateListRequest } from '@/types/list-intent-transformers';

export function MetadataPanel() {
  const { topic } = useStudioForm();
  const {
    listTitle,
    listDescription,
    category,
    setListTitle,
    setListDescription,
    setCategory,
    suggestTitleFromTopic,
  } = useStudioMetadata();
  const { canPublish, hasTitle, hasItems, itemCount } = useStudioValidation();
  const generatedItems = useStudioStore((state) => state.generatedItems);
  const {
    isPublishing,
    publishError,
    setPublishing,
    setPublishError,
    setPublishedListId,
    setShowSuccess,
  } = useStudioPublishing();

  const createListMutation = useCreateListWithUser();

  const handlePublish = async () => {
    if (!canPublish) return;

    setPublishing(true);
    setPublishError(null);

    try {
      // Generate temp user ID
      const tempUserId = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Build request payload
      const request: CreateListRequest = {
        title: listTitle.trim(),
        category,
        size: generatedItems.length,
        time_period: 'all-time',
        description: listDescription.trim() || undefined,
        user: {
          email: `temp-${tempUserId}@goat.app`,
          name: `User ${tempUserId.slice(-6)}`,
        },
        metadata: {
          color: DEFAULT_LIST_INTENT_COLOR,
        },
      };

      const result = await createListMutation.mutateAsync(request);

      setPublishedListId(result.list.id);
      setShowSuccess(true);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-800/50">
        <Settings2 className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-gray-300">List Configuration</span>
      </div>

      {/* Title Section */}
      <div className="space-y-2">
        <label
          htmlFor="list-title"
          className="flex items-center gap-2 text-sm font-medium text-gray-300"
        >
          <Tag className="w-3.5 h-3.5 text-gray-500" />
          Title <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1 group">
            <input
              id="list-title"
              type="text"
              value={listTitle}
              onChange={(e) => setListTitle(e.target.value)}
              placeholder="My Awesome List"
              maxLength={100}
              className="w-full px-3 py-2.5 bg-gray-900/60 border border-gray-700/50
                rounded-lg text-white placeholder-gray-500 text-sm
                focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
                transition-all"
            />
          </div>
          {topic && !listTitle && (
            <button
              type="button"
              onClick={suggestTitleFromTopic}
              title="Use topic as title"
              className="p-2.5 bg-gray-900/60 border border-gray-700/50 rounded-lg
                text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30
                hover:bg-cyan-500/5 transition-all"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {!hasTitle && itemCount > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertCircle className="w-3 h-3" />
            Title is required to publish
          </p>
        )}
      </div>

      {/* Description Section */}
      <div className="space-y-2">
        <label
          htmlFor="list-description"
          className="flex items-center gap-2 text-sm font-medium text-gray-300"
        >
          <FileText className="w-3.5 h-3.5 text-gray-500" />
          Description
        </label>
        <textarea
          id="list-description"
          value={listDescription}
          onChange={(e) => setListDescription(e.target.value)}
          placeholder="What is this list about?"
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2.5 bg-gray-900/60 border border-gray-700/50
            rounded-lg text-white placeholder-gray-500 text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
            transition-all"
        />
      </div>

      {/* Category Section */}
      <div className="space-y-2">
        <label
          htmlFor="list-category"
          className="flex items-center gap-2 text-sm font-medium text-gray-300"
        >
          Category
        </label>
        <select
          id="list-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-900/60 border border-gray-700/50
            rounded-lg text-white text-sm appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
            transition-all"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
          }}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Validation Status */}
      <div className="p-4 rounded-xl bg-gray-900/40 border border-gray-800/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Publish checklist</span>
        </div>

        <div className="space-y-2">
          {/* Title check */}
          <div className="flex items-center gap-2 text-sm">
            {hasTitle ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
            )}
            <span className={hasTitle ? 'text-gray-300' : 'text-gray-500'}>
              Title added
            </span>
          </div>

          {/* Items check */}
          <div className="flex items-center gap-2 text-sm">
            {hasItems ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
            )}
            <span className={hasItems ? 'text-gray-300' : 'text-gray-500'}>
              {itemCount >= 5
                ? `${itemCount} items ready`
                : `${itemCount}/5 items (need ${5 - itemCount} more)`}
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {publishError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{publishError}</p>
        </div>
      )}

      {/* Publish Button */}
      <div className="pt-2">
        <div className="relative group">
          {/* Button glow */}
          {canPublish && !isPublishing && (
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 to-purple-500/30
              rounded-2xl opacity-75 group-hover:opacity-100 blur-xl transition-opacity" />
          )}

          <Button
            onClick={handlePublish}
            disabled={!canPublish || isPublishing}
            className={cn(
              'relative w-full py-3 font-semibold rounded-xl transition-all',
              canPublish && !isPublishing
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg shadow-cyan-500/20'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish List'
            )}
          </Button>
        </div>

        {!canPublish && !isPublishing && (
          <p className="text-xs text-gray-500 text-center mt-3">
            Complete the checklist above to publish
          </p>
        )}
      </div>
    </div>
  );
}
