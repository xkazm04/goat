'use client';

/**
 * StudioMain
 * Main content area for the List Creation Studio
 * Contains the topic input form and generated items list
 */

import { ContainerProvider } from '@/lib/layout/ContainerProvider';
import { TopicInputForm } from './TopicInputForm';
import { GeneratedItemsList } from './GeneratedItemsList';
import { PublishSuccess } from './PublishSuccess';
import { useStudioPublishing, useStudioStore } from '@/stores/studio-store';

export interface StudioMainProps {
  /** Optional children to render instead of default content */
  children?: React.ReactNode;
}

/**
 * StudioMain Component
 * Wraps content in ContainerProvider for component-level responsiveness.
 */
export function StudioMain({ children }: StudioMainProps) {
  const { showSuccess, publishedListId, setShowSuccess } = useStudioPublishing();
  const listTitle = useStudioStore((state) => state.listTitle);

  return (
    <>
      <ContainerProvider name="studio-main" className="flex-1">
        <div className="@container">
          {children || <StudioMainContent />}
        </div>
      </ContainerProvider>

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

/**
 * Default content for the main studio area
 * Contains the topic input form and generated items list
 */
function StudioMainContent() {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
      <TopicInputForm />
      <GeneratedItemsList />
    </div>
  );
}
