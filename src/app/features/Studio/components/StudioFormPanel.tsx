'use client';

/**
 * StudioFormPanel
 * Contains the topic input form for list creation
 * Lives in the top-left of the studio layout.
 * Shows a post-generation item count summary.
 */

import { Surface } from '@/components/visual';
import { TopicInputForm } from './TopicInputForm';
import { useStudioGeneration, useStudioItems } from '@/stores/studio-store';

export function StudioFormPanel() {
  const { isGenerating } = useStudioGeneration();
  const { generatedItems } = useStudioItems();

  const showItemCount = !isGenerating && generatedItems.length > 0;

  return (
    <Surface variant="glass" className="rounded-2xl p-4">
      <TopicInputForm />
      {showItemCount && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          {generatedItems.length} items generated — edit titles or remove unwanted items below
        </p>
      )}
    </Surface>
  );
}
