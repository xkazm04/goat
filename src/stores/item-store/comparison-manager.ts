import { BacklogItemType } from '@/types/match';
import { ComparisonState } from './types';

export class ComparisonManager {
  static createInitialState(): ComparisonState {
    return {
      isOpen: false,
      items: [],
      selectedForComparison: [],
      comparisonMode: 'grid'
    };
  }

  static addItemToComparison(
    state: ComparisonState,
    item: BacklogItemType
  ): ComparisonState {
    const isAlreadyInComparison = state.items.some(compareItem => compareItem.id === item.id);
    
    if (isAlreadyInComparison) {
      return state;
    }

    return {
      ...state,
      items: [...state.items, item]
    };
  }

  static removeItemFromComparison(
    state: ComparisonState,
    itemId: string
  ): ComparisonState {
    return {
      ...state,
      items: state.items.filter(item => item.id !== itemId),
      selectedForComparison: state.selectedForComparison.filter(id => id !== itemId)
    };
  }

  static toggleItemSelection(
    state: ComparisonState,
    itemId: string
  ): ComparisonState {
    const isSelected = state.selectedForComparison.includes(itemId);
    
    return {
      ...state,
      selectedForComparison: isSelected
        ? state.selectedForComparison.filter(id => id !== itemId)
        : [...state.selectedForComparison, itemId]
    };
  }

  static clearComparison(state: ComparisonState): ComparisonState {
    return {
      ...state,
      items: [],
      selectedForComparison: []
    };
  }

  static setComparisonMode(
    state: ComparisonState,
    mode: ComparisonState['comparisonMode']
  ): ComparisonState {
    return {
      ...state,
      comparisonMode: mode
    };
  }

  static openComparison(state: ComparisonState): ComparisonState {
    return {
      ...state,
      isOpen: true
    };
  }

  static closeComparison(state: ComparisonState): ComparisonState {
    return {
      ...state,
      isOpen: false,
      selectedForComparison: []
    };
  }
}