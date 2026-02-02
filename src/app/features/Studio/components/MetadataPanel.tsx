'use client';

/**
 * MetadataPanel
 *
 * Compact sidebar showing publish readiness checklist and publish button.
 * Title and description are now in TopicInputForm.
 * Now also saves new items to Supabase on publish for reuse.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import {
  useStudioForm,
  useStudioMetadata,
  useStudioValidation,
  useStudioPublishing,
  useStudioItems,
  useStudioCriteria,
} from '@/stores/studio-store';
import { useCreateListWithUser } from '@/hooks/use-top-lists';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { DEFAULT_LIST_INTENT_COLOR } from '@/types/list-intent';
import { getTemplateById } from '@/lib/criteria/templates';
import { categoryToDbValue } from '@/lib/config/category-config';
import type { CreateListRequest } from '@/types/list-intent-transformers';
import type { ListCriteriaConfig } from '@/lib/criteria/types';

export function MetadataPanel() {
  const { listSize } = useStudioForm();
  const { listTitle, listDescription, category } = useStudioMetadata();
  const { canPublish, hasTitle, hasItems, itemCount } = useStudioValidation();
  const { generatedItems } = useStudioItems();
  const { criteriaMode, selectedProfileId, customProfile } = useStudioCriteria();
  const {
    isPublishing,
    publishError,
    setPublishing,
    setPublishError,
    setPublishedListId,
    setShowSuccess,
  } = useStudioPublishing();

  const createListMutation = useCreateListWithUser();

  // Build criteria config from selected profile
  const buildCriteriaConfig = (): ListCriteriaConfig | null => {
    if (criteriaMode === 'none' || !selectedProfileId) {
      return null;
    }

    // For custom profiles
    if (criteriaMode === 'custom' && customProfile) {
      return {
        profileId: customProfile.id,
        profileName: customProfile.name,
        criteria: customProfile.criteria,
        createdAt: customProfile.createdAt,
        updatedAt: customProfile.updatedAt,
      };
    }

    // For preset profiles
    const template = getTemplateById(selectedProfileId);
    if (template) {
      const now = new Date().toISOString();
      return {
        profileId: template.id,
        profileName: template.name,
        criteria: template.criteria,
        createdAt: now,
        updatedAt: now,
      };
    }

    return null;
  };

  const handlePublish = async () => {
    if (!canPublish) return;

    setPublishing(true);
    setPublishError(null);

    try {
      // Convert category to database enum format (lowercase)
      const dbCategory = categoryToDbValue(category);

      // Save new items (not in DB) to Supabase for future reuse
      const newItems = generatedItems.filter(item => !item.db_matched);
      if (newItems.length > 0) {
        try {
          await apiClient.post('/studio/save-items', {
            items: newItems.map(item => ({
              name: item.title,
              category: dbCategory,
              description: item.description || undefined,
              image_url: item.image_url || undefined,
              reference_url: item.wikipedia_url || undefined,
            })),
          });
          console.log(`[Studio] Saved ${newItems.length} new items to database`);
        } catch (err) {
          // Don't block publish if item save fails
          console.warn('[Studio] Failed to save new items:', err);
        }
      }

      const tempUserId = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Build criteria config if selected
      const criteriaConfig = buildCriteriaConfig();

      const request: CreateListRequest & { criteria_config?: ListCriteriaConfig } = {
        title: listTitle.trim(),
        category: dbCategory,
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
        ...(criteriaConfig && { criteria_config: criteriaConfig }),
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
      {/* Publish Readiness */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Ready to Publish?
        </span>
        <div className="space-y-2 p-3 bg-gray-900/40 border border-gray-800/50 rounded-lg">
          {/* Title check */}
          <div className="flex items-center gap-2 text-sm">
            {hasTitle ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-600 flex-shrink-0" />
            )}
            <span className={hasTitle ? 'text-gray-200' : 'text-gray-500'}>
              Title set
            </span>
          </div>

          {/* Items check */}
          <div className="flex items-center gap-2 text-sm">
            {hasItems ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-600 flex-shrink-0" />
            )}
            <span className={hasItems ? 'text-gray-200' : 'text-gray-500'}>
              Items: {itemCount}/{listSize}
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {publishError && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">{publishError}</p>
        </div>
      )}

      {/* Title warning */}
      {!hasTitle && itemCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Add a title above to publish
        </p>
      )}

      {/* Publish Button */}
      <motion.button
        onClick={handlePublish}
        disabled={!canPublish || isPublishing}
        whileHover={canPublish && !isPublishing ? { scale: 1.02 } : undefined}
        whileTap={canPublish && !isPublishing ? { scale: 0.98 } : undefined}
        className={cn(
          'w-full h-10 text-sm font-medium rounded-lg transition-all duration-200',
          'flex items-center justify-center gap-2',
          canPublish && !isPublishing
            ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]'
            : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/30'
        )}
      >
        <AnimatePresence mode="wait">
          {isPublishing ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Publishing...
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Publish List
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
