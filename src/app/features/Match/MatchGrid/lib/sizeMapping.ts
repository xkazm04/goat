/**
 * Size Mapping Utility
 * Contains size configurations for different grid item sizes
 */

export type GridItemSize = 'small' | 'medium' | 'large';

export interface SizeClasses {
  icon: string;
  container: string;
  text: string;
  number: string;
  badge: string;
  padding: string;
  dragHandle?: string;
  removeButton?: string;
  removeIcon?: string;
}

/**
 * Get size classes for grid items
 * Returns Tailwind classes for different size variants
 */
export const getSizeClasses = (size: GridItemSize): SizeClasses => {
  const sizeClassesMap: Record<GridItemSize, SizeClasses> = {
    large: {
      icon: 'w-10 h-10',
      container: 'h-44 lg:h-48 xl:h-52',
      text: 'text-3xl',
      number: 'text-xl lg:text-2xl xl:text-3xl',
      badge: 'text-sm lg:text-base xl:text-lg',
      padding: 'p-4 lg:p-5 xl:p-6',
      dragHandle: 'w-5 h-5',
      removeButton: 'w-8 h-8',
      removeIcon: 'w-4 h-4'
    },
    medium: {
      icon: 'w-8 h-8',
      container: 'h-36 lg:h-40 xl:h-44',
      text: 'text-2xl',
      number: 'text-base lg:text-lg xl:text-xl',
      badge: 'text-xs lg:text-sm xl:text-base',
      padding: 'p-3 lg:p-4 xl:p-5',
      dragHandle: 'w-4 h-4',
      removeButton: 'w-7 h-7',
      removeIcon: 'w-3.5 h-3.5'
    },
    small: {
      icon: 'w-6 h-6',
      container: 'h-28 sm:h-32 lg:h-36 xl:h-40',
      text: 'text-lg',
      number: 'text-xs sm:text-sm lg:text-base xl:text-base',
      badge: 'text-xs',
      padding: 'p-2 sm:p-2.5 lg:p-3 xl:p-3.5',
      dragHandle: 'w-3.5 h-3.5',
      removeButton: 'w-6 h-6',
      removeIcon: 'w-3 h-3'
    }
  };

  return sizeClassesMap[size];
};

/**
 * Get size for position
 * Determines the appropriate size based on grid position
 */
export const getSizeForPosition = (position: number): GridItemSize => {
  if (position < 3) return 'large';  // Top 3
  if (position < 10) return 'medium'; // Positions 4-10
  return 'small';                     // Remaining positions
};

/**
 * Get grid layout classes
 * Returns grid column and gap classes for different sections
 */
export const getGridLayoutClasses = (section: 'top3' | 'mid' | 'remaining') => {
  const layoutMap = {
    top3: {
      gridCols: 'flex items-end justify-center gap-8',
      gap: 'gap-8',
      containerClass: 'mb-16'
    },
    mid: {
      gridCols: 'grid-cols-7',
      gap: 'gap-4 lg:gap-6',
      containerClass: 'mb-8'
    },
    remaining: {
      gridCols: 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12',
      gap: 'gap-3 lg:gap-4 xl:gap-5',
      containerClass: 'flex-1'
    }
  };

  return layoutMap[section];
};

/**
 * Get rank badge color
 * Returns color configuration for position badges (top 3)
 */
export const getRankBadgeColor = (position: number) => {
  const colorMap: Record<number, { background: string; shadow: string }> = {
    0: { background: '#FFD700', shadow: 'rgba(255, 215, 0, 0.6)' },  // Gold
    1: { background: '#C0C0C0', shadow: 'rgba(192, 192, 192, 0.6)' }, // Silver
    2: { background: '#CD7F32', shadow: 'rgba(205, 127, 50, 0.6)' }   // Bronze
  };

  return colorMap[position] || { background: '#94a3b8', shadow: 'rgba(148, 163, 184, 0.6)' };
};
