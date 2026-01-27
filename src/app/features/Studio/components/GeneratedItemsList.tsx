'use client';

/**
 * GeneratedItemsList
 *
 * Displays the list of AI-generated items with images, descriptions,
 * and Wikipedia links. Shows loading skeletons during generation.
 */

import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudioItems, useStudioGeneration } from '@/stores/studio-store';
import type { EnrichedItem } from '@/types/studio';

export function GeneratedItemsList() {
  const { generatedItems } = useStudioItems();
  const { isGenerating } = useStudioGeneration();

  // Loading state - show skeletons
  if (isGenerating) {
    return (
      <div className="space-y-4 mt-8">
        <h3 className="text-lg font-medium text-white">Generating items...</h3>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ItemSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state - don't show anything until items are generated
  if (generatedItems.length === 0) {
    return null;
  }

  // Items list
  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">
          Generated Items ({generatedItems.length})
        </h3>
      </div>

      <div className="grid gap-4">
        {generatedItems.map((item, index) => (
          <GeneratedItemCard key={index} item={item} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for an item card
 */
function ItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Individual item card displaying rank, image, title, description, and links
 */
function GeneratedItemCard({
  item,
  rank,
}: {
  item: EnrichedItem;
  rank: number;
}) {
  return (
    <div
      className="flex gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-xl
        hover:border-gray-700 transition-colors"
    >
      {/* Rank Badge */}
      <div
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center
          bg-gradient-to-br from-cyan-500/20 to-purple-500/20
          border border-gray-700/50 rounded-lg"
      >
        <span className="text-sm font-bold text-cyan-400">{rank}</span>
      </div>

      {/* Image */}
      {item.image_url ? (
        <img
          src={item.image_url}
          alt={item.title}
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-800"
          loading="lazy"
        />
      ) : (
        <div
          className="w-20 h-20 bg-gray-800 rounded-lg flex-shrink-0
            flex items-center justify-center"
        >
          <span className="text-2xl">🎯</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white truncate">{item.title}</h4>
        <p className="text-sm text-gray-400 line-clamp-2 mt-1">
          {item.description}
        </p>
        {item.wikipedia_url && (
          <a
            href={item.wikipedia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-cyan-400
              hover:text-cyan-300 mt-2 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Wikipedia
          </a>
        )}
      </div>
    </div>
  );
}
