import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Batch-fetch list thumbnail images via /api/lists/thumbnails
 * Collapses N+1 individual list fetches into 1-2 requests.
 */
export function useListThumbnails(listIds: string[]) {
  const stableIds = useMemo(() => [...listIds].sort().join(','), [listIds]);

  const { data, isLoading } = useQuery({
    queryKey: ['list-thumbnails', stableIds],
    queryFn: async () => {
      if (!listIds.length) return {} as Record<string, string>;
      const res = await fetch(`/api/lists/thumbnails?ids=${listIds.join(',')}`);
      if (!res.ok) return {} as Record<string, string>;
      const json = await res.json();
      return (json.data ?? json) as Record<string, string>;
    },
    enabled: listIds.length > 0,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });

  const imageMap = useMemo(() => {
    const map: Record<string, { url: string | null; loading: boolean }> = {};
    for (const id of listIds) {
      map[id] = {
        url: data?.[id] ?? null,
        loading: isLoading,
      };
    }
    return map;
  }, [data, isLoading, listIds]);

  return imageMap;
}
