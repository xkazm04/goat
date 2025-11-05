export interface GridSection {
  id: string;
  positions: number[];
  gridCols: string;
  gap: string;
  size: 'small' | 'medium' | 'large';
  containerClass?: string;
  itemClass?: string;
  showRankLabel?: boolean;
  rankLabelClass?: string;
  animationDelay?: number;
  animationStagger?: number;
}

export interface PodiumConfig {
  position: number;
  label: string;
  labelClass: string;
  containerClass: string;
  animationDelay: number;
  size: 'large';
}

export const useSizeClasses = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'large':
      return {
        container: 'w-full h-full',
        fixedHeight: 'h-52 lg:h-56 xl:h-60',
        emptyNumber: 'text-8xl lg:text-9xl xl:text-[10rem]',
        avatar: 'w-20 h-24 lg:w-24 lg:h-28 xl:w-28 xl:h-32', 
        icon: 'w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12',
        title: 'text-sm lg:text-base xl:text-lg font-bold leading-tight',
        rankSection: 'h-12 lg:h-14 xl:h-16',
        rankNumber: 'text-xl lg:text-2xl xl:text-3xl',
        padding: 'p-4 lg:p-5 xl:p-6',
        removeButton: 'w-7 h-7 lg:w-8 lg:h-8',
        removeIcon: 'w-3.5 h-3.5 lg:w-4 lg:h-4',
        dragHandle: 'w-5 h-5 lg:w-6 lg:h-6',
        titleHeight: 'h-16 lg:h-18 xl:h-20' 
      };
    case 'medium':
      return {
        container: 'w-full h-full',
        emptyNumber: 'text-6xl lg:text-7xl xl:text-8xl',
        avatar: 'w-16 h-20 lg:w-20 lg:h-24 xl:w-22 xl:h-26', 
        icon: 'w-6 h-6 lg:w-8 lg:h-8 xl:w-9 xl:h-9',
        title: 'text-xs lg:text-sm xl:text-base font-semibold leading-tight',
        rankSection: 'h-10 lg:h-12 xl:h-14',
        rankNumber: 'text-base lg:text-lg xl:text-xl',
        padding: 'p-3 lg:p-4 xl:p-5',
        removeButton: 'w-6 h-6 lg:w-7 lg:h-7',
        removeIcon: 'w-3 h-3 lg:w-3.5 lg:h-3.5',
        dragHandle: 'w-4 h-4 lg:w-5 lg:h-5',
        titleHeight: 'h-12 lg:h-14 xl:h-16'
      };
    default: 
      return {
        container: 'w-full h-full',
        fixedHeight: 'h-32 sm:h-36 lg:h-40 xl:h-44',
        emptyNumber: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
        avatar: 'w-12 h-14 sm:w-14 sm:h-16 lg:w-16 lg:h-20 xl:w-18 xl:h-22', 
        icon: 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7',
        title: 'text-xs sm:text-xs lg:text-sm xl:text-sm font-medium leading-tight',
        rankSection: 'h-7 sm:h-8 lg:h-9 xl:h-10',
        rankNumber: 'text-xs sm:text-sm lg:text-base xl:text-base',
        padding: 'p-2 sm:p-2.5 lg:p-3 xl:p-3.5',
        removeButton: 'w-5 h-5 sm:w-6 sm:h-6',
        removeIcon: 'w-2.5 h-2.5 sm:w-3 h-3',
        dragHandle: 'w-3 h-3 sm:w-3.5 h-3.5',
        titleHeight: 'h-8 sm:h-10 lg:h-12 xl:h-14'
      };
  }
};