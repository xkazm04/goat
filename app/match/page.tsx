"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MatchContainer } from '@/app/features/Match/MatchContainer';
import { useListStore } from '@/app/stores/use-list-store';
import { useItemStore } from '@/app/stores/item-store';

export default function MatchPage() {
  const searchParams = useSearchParams();
  const listId = searchParams.get('list');
  
  const { currentList, setCurrentList } = useListStore();
  const { syncWithList } = useItemStore();

  useEffect(() => {
    if (listId && (!currentList || currentList.id !== listId)) {
      if (currentList) {
        syncWithList(listId);
      }
    }
  }, [listId, currentList, syncWithList]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <MatchContainer />
    </div>
  );
}