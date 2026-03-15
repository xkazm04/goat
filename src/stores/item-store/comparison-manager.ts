import { BacklogItemType } from '@/types/match';
import { ComparisonState } from './types';

export function createInitialComparisonState(): ComparisonState {
  return {
    isOpen: false,
    items: [],
    selectedForComparison: [],
    comparisonMode: 'grid',
  };
}

export function addItemToComparison(
  state: ComparisonState,
  item: BacklogItemType
): ComparisonState {
  if (state.items.some((compareItem) => compareItem.id === item.id)) {
    return state;
  }
  return { ...state, items: [...state.items, item] };
}

export function removeItemFromComparison(
  state: ComparisonState,
  itemId: string
): ComparisonState {
  return {
    ...state,
    items: state.items.filter((item) => item.id !== itemId),
    selectedForComparison: state.selectedForComparison.filter((id) => id !== itemId),
  };
}

export function toggleItemSelection(
  state: ComparisonState,
  itemId: string
): ComparisonState {
  const isSelected = state.selectedForComparison.includes(itemId);
  return {
    ...state,
    selectedForComparison: isSelected
      ? state.selectedForComparison.filter((id) => id !== itemId)
      : [...state.selectedForComparison, itemId],
  };
}

export function clearComparison(state: ComparisonState): ComparisonState {
  return { ...state, items: [], selectedForComparison: [] };
}

export function setComparisonMode(
  state: ComparisonState,
  mode: ComparisonState['comparisonMode']
): ComparisonState {
  return { ...state, comparisonMode: mode };
}

export function openComparison(state: ComparisonState): ComparisonState {
  return { ...state, isOpen: true };
}

export function closeComparison(state: ComparisonState): ComparisonState {
  return { ...state, isOpen: false, selectedForComparison: [] };
}
