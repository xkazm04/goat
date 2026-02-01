'use client';

/**
 * StudioFormPanel
 * Contains the topic input form for list creation
 * Lives in the top-left of the studio layout
 */

import { Surface } from '@/components/visual';
import { TopicInputForm } from './TopicInputForm';

export function StudioFormPanel() {
  return (
    <Surface variant="glass" className="rounded-2xl p-4">
      <TopicInputForm />
    </Surface>
  );
}
