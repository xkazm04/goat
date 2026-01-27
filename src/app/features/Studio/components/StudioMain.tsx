'use client';

/**
 * StudioMain
 * Main content area for the List Creation Studio
 * Contains the topic input form and generated items list
 * with premium glass-morphism styling
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
    <div className="relative">
      {/* Glass card container */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.8) 0%, rgba(17, 24, 39, 0.4) 100%)',
        }}
      >
        {/* Gradient border */}
        <div className="absolute inset-0 rounded-2xl p-px">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-transparent to-purple-500/20" />
        </div>

        {/* Inner content */}
        <div className="relative border border-gray-800/50 rounded-2xl p-6 backdrop-blur-xl">
          {/* Corner decorations */}
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none">
            <div className="absolute top-4 right-4 w-px h-8 bg-gradient-to-b from-cyan-500/50 to-transparent" />
            <div className="absolute top-4 right-4 w-8 h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none">
            <div className="absolute bottom-4 left-4 w-px h-8 bg-gradient-to-t from-purple-500/50 to-transparent" />
            <div className="absolute bottom-4 left-4 w-8 h-px bg-gradient-to-l from-purple-500/50 to-transparent" />
          </div>

          <TopicInputForm />
          <GeneratedItemsList />
        </div>
      </div>
    </div>
  );
}
