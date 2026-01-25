/**
 * OG Card Layouts Index
 * Export all card layout components
 */

export { ListLayout } from './ListLayout';
export { GridLayout } from './GridLayout';
export { FeaturedLayout } from './FeaturedLayout';

import type { OGCardLayout, OGCardData, OGCardOptions, OGCardTheme } from '../types';
import { DEFAULT_THEME } from '../types';
import { ListLayout } from './ListLayout';
import { GridLayout } from './GridLayout';
import { FeaturedLayout } from './FeaturedLayout';

/**
 * Get the appropriate layout component for the given layout type
 */
export function getLayoutComponent(layout: OGCardLayout) {
  switch (layout) {
    case 'grid':
      return GridLayout;
    case 'featured':
      return FeaturedLayout;
    case 'list':
    case 'minimal':
    case 'compact':
    default:
      return ListLayout;
  }
}

/**
 * Render the appropriate layout for OG image generation
 */
export function renderLayout(
  data: OGCardData,
  options: OGCardOptions,
  theme: OGCardTheme = DEFAULT_THEME
) {
  const LayoutComponent = getLayoutComponent(options.layout);
  return <LayoutComponent data={data} options={options} theme={theme} />;
}
