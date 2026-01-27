'use client';

/**
 * MetadataPanel
 *
 * Form for configuring list metadata: title, description, category.
 * Includes publish button with validation.
 */

import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useStudioForm,
  useStudioMetadata,
  useStudioValidation,
} from '@/stores/studio-store';
import { CATEGORIES } from '@/lib/config/category-config';
import { cn } from '@/lib/utils';

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

  return (
    <div className="space-y-4">
      {/* Title Section */}
      <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
        <label
          htmlFor="list-title"
          className="text-sm font-medium text-gray-300 mb-2 block"
        >
          List Title <span className="text-red-400">*</span>
        </label>
        <div className="flex gap-2">
          <input
            id="list-title"
            type="text"
            value={listTitle}
            onChange={(e) => setListTitle(e.target.value)}
            placeholder="My Awesome List"
            maxLength={100}
            className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700
              rounded-lg text-white placeholder-gray-500 text-sm
              focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          {topic && !listTitle && (
            <button
              type="button"
              onClick={suggestTitleFromTopic}
              title="Use topic as title"
              className="p-2 bg-gray-800/50 border border-gray-700 rounded-lg
                text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50
                transition-colors"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          )}
        </div>
        {!hasTitle && itemCount > 0 && (
          <p className="text-xs text-amber-400 mt-1">
            Title is required to publish
          </p>
        )}
      </div>

      {/* Description Section */}
      <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
        <label
          htmlFor="list-description"
          className="text-sm font-medium text-gray-300 mb-2 block"
        >
          Description
        </label>
        <textarea
          id="list-description"
          value={listDescription}
          onChange={(e) => setListDescription(e.target.value)}
          placeholder="What is this list about?"
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700
            rounded-lg text-white placeholder-gray-500 text-sm resize-none
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>

      {/* Category Section */}
      <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
        <label
          htmlFor="list-category"
          className="text-sm font-medium text-gray-300 mb-2 block"
        >
          Category
        </label>
        <select
          id="list-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700
            rounded-lg text-white text-sm
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Item Count Info */}
      <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Items</span>
          <span
            className={cn(
              'text-sm font-medium',
              hasItems ? 'text-green-400' : 'text-amber-400'
            )}
          >
            {itemCount} / 5 min
          </span>
        </div>
        {!hasItems && itemCount > 0 && (
          <p className="text-xs text-amber-400 mt-1">
            Need at least 5 items to publish
          </p>
        )}
      </div>

      {/* Publish Button */}
      <div className="pt-4">
        <Button
          disabled={!canPublish}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500
            hover:from-cyan-400 hover:to-purple-400
            disabled:from-gray-600 disabled:to-gray-600
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Publish List
        </Button>
        {!canPublish && (
          <p className="text-xs text-gray-500 text-center mt-2">
            {!hasTitle && !hasItems
              ? 'Add a title and generate items to publish'
              : !hasTitle
              ? 'Add a title to publish'
              : 'Generate at least 5 items to publish'}
          </p>
        )}
      </div>
    </div>
  );
}
