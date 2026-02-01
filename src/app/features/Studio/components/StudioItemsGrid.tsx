'use client';

/**
 * StudioItemsGrid
 *
 * Full-width container with tabbed interface for items and criteria.
 * Re-exports StudioContentTabs as the main component.
 */

import { StudioContentTabs } from './StudioContentTabs';
import { PublishSuccess } from './PublishSuccess';
import { useStudioPublishing, useStudioStore } from '@/stores/studio-store';

export function StudioItemsGrid() {
  const { showSuccess, publishedListId, setShowSuccess } = useStudioPublishing();
  const listTitle = useStudioStore((state) => state.listTitle);

  return (
    <>
      <StudioContentTabs />

      {/* Success Overlay */}
      {showSuccess && publishedListId && (
        <PublishSuccess
          listId={publishedListId}
          listTitle={listTitle}
          onDismiss={() => setShowSuccess(false)}
        />
      )}
    </>
  );
}
