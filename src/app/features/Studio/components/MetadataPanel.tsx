'use client';

/**
 * MetadataPanel
 *
 * Compact form for configuring list metadata.
 * Title + Description with checklist and publish button.
 * Category is now in TopicInputForm alongside the topic input.
 */

import { Wand2, Loader2, Tag, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useStudioForm,
  useStudioMetadata,
  useStudioValidation,
  useStudioPublishing,
} from '@/stores/studio-store';
import { useCreateListWithUser } from '@/hooks/use-top-lists';
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
    suggestTitleFromTopic,
  } = useStudioMetadata();
  const { canPublish, hasTitle, hasItems, itemCount, listSize } = useStudioValidation();
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
      const tempUserId = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const request: CreateListRequest = {
        title: listTitle.trim(),
        category,
        size: listSize,
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
    <div className="space-y-4">
      {/* Title with auto-suggest */}
      <div className="space-y-1.5">
        <label
          htmlFor="list-title"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400"
        >
          <Tag className="w-3 h-3" />
          List Title <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-1.5">
          <input
            id="list-title"
            type="text"
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            placeholder="My Awesome List"
            maxLength={100}
            className="flex-1 px-2.5 py-2 bg-gray-900/60 border border-gray-700/50
              rounded-md text-white placeholder-gray-500 text-sm
              focus:outline-none focus:ring-1 focus:ring-cyan-500/50
              transition-all"
          />
          {topic && !listTitle && (
            <button
              type="button"
              onClick={suggestTitleFromTopic}
              title="Use topic as title"
              className="p-2 bg-gray-900/60 border border-gray-700/50 rounded-md
                text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30
                transition-all"
            >
              <Wand2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Description + Checklist side by side */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="list-description"
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400"
          >
            <FileText className="w-3 h-3" />
            Description
          </label>
          <textarea
            id="list-description"
            value={listDescription}
            onChange={(e) => setListDescription(e.target.value)}
            placeholder="What is this list about?"
            maxLength={500}
            rows={2}
            className="w-full px-2.5 py-2 bg-gray-900/60 border border-gray-700/50
              rounded-md text-white placeholder-gray-500 text-sm resize-none
              focus:outline-none focus:ring-1 focus:ring-cyan-500/50
              transition-all"
          />
        </div>

        {/* Checklist - Compact */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-gray-400">Ready?</span>
          <div className="space-y-1.5 p-2 bg-gray-900/40 border border-gray-800/50 rounded-md">
            {/* Title check */}
            <div className="flex items-center gap-1.5 text-xs">
              {hasTitle ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-gray-600 flex-shrink-0" />
              )}
              <span className={hasTitle ? 'text-gray-300' : 'text-gray-500'}>
                Title
              </span>
            </div>

            {/* Items check */}
            <div className="flex items-center gap-1.5 text-xs">
              {hasItems ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-gray-600 flex-shrink-0" />
              )}
              <span className={hasItems ? 'text-gray-300' : 'text-gray-500'}>
                {itemCount}/{listSize}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {publishError && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-md">
          <p className="text-xs text-red-400">{publishError}</p>
        </div>
      )}

      {/* Title warning */}
      {!hasTitle && itemCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-400">
          <AlertCircle className="w-3 h-3" />
          Title is required to publish
        </p>
      )}

      {/* Publish Button */}
      <Button
        onClick={handlePublish}
        disabled={!canPublish || isPublishing}
        className={cn(
          'w-full h-9 text-sm font-medium rounded-lg transition-all',
          canPublish && !isPublishing
            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-md shadow-cyan-500/15'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        )}
      >
        {isPublishing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Publishing...
          </>
        ) : (
          'Publish List'
        )}
      </Button>
    </div>
  );
}
