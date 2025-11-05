/**
 * Collection Feature Types
 *
 * Type definitions for the bottom drawer collection feature
 * that replaces the sidebar backlog design.
 */

import { BacklogItemNew, ItemGroup } from "@/types/backlog-groups";

export interface CollectionDrawerState {
  isOpen: boolean;
  height: number; // Drawer height in pixels
  selectedGroupIds: Set<string>; // Multi-select group IDs
  viewMode: 'grid' | 'list';
}

export interface CollectionGroup extends ItemGroup {
  isExpanded: boolean;
  isLoading: boolean;
}

export interface CollectionItem extends BacklogItemNew {
  groupId: string;
}

export interface GroupDivider {
  groupId: string;
  groupName: string;
  itemCount: number;
  color?: string;
}
