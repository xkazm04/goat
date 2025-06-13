export interface GridItemType {
  id: string;
  title: string;
  tags: string[];
  matched: boolean;
  matchedWith?: string;
  description?: string;
}

export interface BacklogItemType {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  matched: boolean;
  matchedWith?: string;
}

export interface BacklogGroupType {
  id: string;
  title: string;
  isOpen: boolean;
  items: BacklogItemType[];
}