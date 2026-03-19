import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from './use-toast';

interface ForkResult {
  success: boolean;
  listId?: string;
  error?: string;
}

interface GridItem {
  id: string;
  item_id: string;
  title: string;
  description: string;
  image_url: string;
  position: number;
  matched: boolean;
}

interface ForkResponse {
  success: boolean;
  data: {
    list: { id: string; title: string; category: string };
    forked_from: { share_code: string; title: string };
    items_copied: number;
    grid_items: GridItem[];
  };
  error?: string;
}

export function useForkRanking() {
  const router = useRouter();
  const [isForking, setIsForking] = useState(false);

  const forkRanking = useCallback(
    async (shareCode: string): Promise<ForkResult> => {
      setIsForking(true);

      try {
        const response = await fetch(`/api/share/${shareCode}/fork`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const data: ForkResponse = await response.json();

        if (!response.ok || !data.success) {
          const error = data.error || 'Failed to fork ranking';
          toast({
            title: 'Fork Failed',
            description: error,
          });
          return { success: false, error };
        }

        const listId = data.data.list.id;

        // Store forked grid items in sessionStorage so the match page can pre-populate
        if (data.data.grid_items?.length > 0) {
          sessionStorage.setItem(
            `fork-grid-${listId}`,
            JSON.stringify(data.data.grid_items)
          );
        }

        toast({
          title: 'Ranking Forked!',
          description: `"${data.data.list.title}" is ready to remix.`,
        });

        // Navigate to the match page with the new list
        router.push(`/goat?list=${listId}`);

        return { success: true, listId };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to fork ranking';
        toast({
          title: 'Fork Failed',
          description: message,
        });
        return { success: false, error: message };
      } finally {
        setIsForking(false);
      }
    },
    [router]
  );

  return { forkRanking, isForking };
}
