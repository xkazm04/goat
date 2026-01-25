/**
 * RichItemCard Module
 *
 * Enhanced item card components with rich preview capabilities.
 * Provides expandable cards, quick actions, metadata badges,
 * and visual indicators for professional item display.
 *
 * @module RichItemCard
 */

// Main card component
export { RichItemCard, default } from './RichItemCard';
export type {
  RichItemData,
  RichItemCardConfig,
  RichItemCardProps,
} from './RichItemCard';

// Quick actions
export {
  QuickActions,
  createQuickActions,
} from './QuickActions';
export type {
  QuickActionType,
  QuickActionConfig,
  QuickActionsPosition,
  QuickActionsProps,
} from './QuickActions';

// Metadata badges
export {
  MetadataBadges,
  createBadgesFromMetadata,
} from './MetadataBadges';
export type {
  MetadataBadgeType,
  MetadataBadgeData,
  MetadataBadgesPosition,
  MetadataBadgesProps,
} from './MetadataBadges';

// Expanded preview
export {
  ExpandedPreview,
  TooltipPreview,
} from './ExpandedPreview';
export type {
  ExpandedPreviewProps,
} from './ExpandedPreview';

// Mini gallery
export {
  MiniGallery,
  ThumbnailStrip,
} from './MiniGallery';
export type {
  MiniGalleryProps,
} from './MiniGallery';

// Item indicators
export {
  ItemIndicators,
  RankedIndicator,
  FavoriteIndicator,
} from './ItemIndicators';
export type {
  IndicatorType,
  ItemIndicatorState,
  IndicatorPosition,
  ItemIndicatorsProps,
} from './ItemIndicators';

/**
 * Quick start example:
 *
 * ```tsx
 * import {
 *   RichItemCard,
 *   createQuickActions,
 *   createBadgesFromMetadata,
 * } from '@/components/RichItemCard';
 *
 * function MyItemGrid({ items }) {
 *   const handleQuickAction = (action, item) => {
 *     if (action === 'add-to-grid') {
 *       // Handle add to grid
 *     }
 *   };
 *
 *   return (
 *     <div className="grid grid-cols-4 gap-4">
 *       {items.map((item, index) => (
 *         <RichItemCard
 *           key={item.id}
 *           item={item}
 *           index={index}
 *           quickActions={createQuickActions({
 *             onAddToGrid: () => handleQuickAction('add-to-grid', item),
 *             onCompare: () => handleQuickAction('compare', item),
 *           })}
 *           badges={createBadgesFromMetadata({
 *             rating: item.rating,
 *             year: item.year,
 *           })}
 *           indicators={{
 *             isRanked: item.isRanked,
 *             rankPosition: item.position,
 *             isFavorite: item.isFavorite,
 *           }}
 *           onQuickAction={handleQuickAction}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
