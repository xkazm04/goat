'use client';

/**
 * StudioFormPanel
 * Glass-morphism container for the topic input form.
 * Hero state: centered with ambient glow. Active state: compact with item count.
 */

import { useStudioGeneration, useStudioItems } from '@/stores/studio-store';

import { TopicInputForm } from './TopicInputForm';

export function StudioFormPanel() {
  const { isGenerating } = useStudioGeneration();
  const { generatedItems } = useStudioItems();

  const hasContent = generatedItems.length > 0 || isGenerating;
  const showItemCount = !isGenerating && generatedItems.length > 0;

  return (
    <div className="relative">
      {/* Ambient glow behind the panel — stronger in hero mode */}
      {!hasContent && (
        <div
          className="absolute -inset-8 rounded-3xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.05) 0%, rgba(6,182,212,0.03) 40%, transparent 70%)',
          }}
        />
      )}

      <div
        className="relative rounded-container p-5 border border-white/[0.06] backdrop-blur-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0.03) 100%)',
          boxShadow: hasContent
            ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
            : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 60px rgba(251,191,36,0.04)',
        }}
      >
        <TopicInputForm />
        {showItemCount && (
          <p className="mt-3 text-xs text-gray-500 text-center">
            {generatedItems.length} items generated — edit titles or remove unwanted items below
          </p>
        )}
      </div>
    </div>
  );
}
