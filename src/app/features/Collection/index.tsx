/**
 * Collection Feature - Bottom Drawer Item Collection
 *
 * Redesigned backlog feature with bottom drawer layout:
 * - Items on top, collection at bottom (tier list style)
 * - Two-part layout: group selector (left) + items panel (right)
 * - Multi-select group filtering
 * - Preserves drag & drop functionality
 * - Follows compact-ui-design.md patterns
 *
 * @module Collection
 */

export { CollectionDrawer } from './CollectionDrawer';
export { CollectionGroupSelector } from './CollectionGroupSelector';
export { CollectionItemsPanel } from './CollectionItemsPanel';
export { CollectionItem } from './CollectionItem';
export { CollectionGroupDivider } from './CollectionGroupDivider';

export type {
  CollectionDrawerState,
  CollectionGroup,
  CollectionItem as CollectionItemType,
  GroupDivider
} from './types';
