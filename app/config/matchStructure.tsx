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