"use client";

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Image as ImageIcon } from 'lucide-react';
import { AdminItemCard } from './AdminItemCard';
import { apiClient } from '@/lib/api/client';
import { MasonryGrid } from '@/components/ui/masonry-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminItemsResponse } from './types';

/**
 * Fetch items without images
 */
async function fetchMissingImageItems(): Promise<AdminItemsResponse> {
  return apiClient.get<AdminItemsResponse>('/top/items', {
    missing_image: true,
    limit: 50,
    offset: 0,
    sort_by: 'created_at',
    sort_order: 'desc'
  });
}

/**
 * MissingImagesSection - Display items without images
 */
export function MissingImagesSection() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'missing-images'],
    queryFn: fetchMissingImageItems,
    staleTime: 60 * 1000, // 1 minute
  });

  return (
    <section className="bg-gray-900/30 rounded-xl border border-gray-800 p-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/30">
            <ImageIcon className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Items Without Images</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {data ? `${data.total} items need images` : 'Loading...'}
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      {/* Error State */}
      {isError && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Failed to load items</p>
            <p className="text-xs text-red-300/70 mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <MasonryGrid
          columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
          gap={16}
          testId="missing-images-skeleton"
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </MasonryGrid>
      )}

      {/* Items Grid */}
      {!isLoading && !isError && data && (
        <>
          {data.items.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">All items have images!</p>
              <p className="text-sm text-gray-500 mt-1">Great job maintaining the database.</p>
            </div>
          ) : (
            <MasonryGrid
              columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
              gap={16}
              enableTransitions={true}
              testId="missing-images-grid"
            >
              {data.items.map((item) => (
                <AdminItemCard
                  key={item.id}
                  item={item}
                  onUpdate={() => refetch()}
                />
              ))}
            </MasonryGrid>
          )}
        </>
      )}
    </section>
  );
}
