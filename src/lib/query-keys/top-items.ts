import { ItemSearchParams } from '../api/top-items';

export const topItemsKeys = {
  all: ['top-items'] as const,
  
  // Items list queries
  items: () => [...topItemsKeys.all, 'items'] as const,
  itemsSearch: (params: ItemSearchParams) => [...topItemsKeys.items(), 'search', params] as const,
  itemsGrouped: (params: ItemSearchParams) => [...topItemsKeys.items(), 'grouped', params] as const,
  itemsPaginated: (params: ItemSearchParams) => [...topItemsKeys.items(), 'paginated', params] as const,
  
  // Individual item queries
  item: (itemId: string) => [...topItemsKeys.all, 'item', itemId] as const,
  
  // Trending items
  trending: (category?: string, limit?: number) => [...topItemsKeys.all, 'trending', { category, limit }] as const,
  
  // Category-specific queries
  categoryItems: (category: string, subcategory?: string) => [
    ...topItemsKeys.items(), 
    'category', 
    category, 
    subcategory
  ] as const,
  
  // Infinite scroll queries
  infinite: (params: ItemSearchParams) => [...topItemsKeys.items(), 'infinite', params] as const,
};