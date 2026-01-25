'use client';

/**
 * SkeletonLoader
 * Loading placeholder components for virtualized lists.
 * Provides smooth loading states while content is being fetched.
 */

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Skeleton variant types
 */
export type SkeletonVariant = 'card' | 'list' | 'compact' | 'grid' | 'custom';

/**
 * Animation style options
 */
export type SkeletonAnimation = 'pulse' | 'wave' | 'shimmer' | 'none';

/**
 * Base skeleton props
 */
export interface SkeletonProps {
  /** Width of skeleton */
  width?: number | string;
  /** Height of skeleton */
  height?: number | string;
  /** Border radius */
  borderRadius?: number | string;
  /** Animation style */
  animation?: SkeletonAnimation;
  /** Custom class name */
  className?: string;
}

/**
 * Skeleton item configuration
 */
export interface SkeletonItemConfig {
  /** Item height */
  height?: number;
  /** Show image placeholder */
  showImage?: boolean;
  /** Image size */
  imageSize?: number;
  /** Show title lines */
  titleLines?: number;
  /** Show description lines */
  descriptionLines?: number;
  /** Show action buttons */
  showActions?: boolean;
  /** Variant */
  variant?: SkeletonVariant;
}

/**
 * Props for SkeletonList component
 */
export interface SkeletonListProps {
  /** Number of skeleton items to show */
  count?: number;
  /** Item configuration */
  itemConfig?: SkeletonItemConfig;
  /** Gap between items */
  gap?: number;
  /** Animation style */
  animation?: SkeletonAnimation;
  /** Custom class name */
  className?: string;
  /** Custom skeleton item renderer */
  renderItem?: (index: number) => React.ReactNode;
}

/**
 * Animation variants
 */
const animationClasses: Record<SkeletonAnimation, string> = {
  pulse: 'animate-pulse',
  wave: 'skeleton-wave',
  shimmer: 'skeleton-shimmer',
  none: '',
};

/**
 * Base Skeleton Component
 */
export const Skeleton = memo(function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 4,
  animation = 'pulse',
  className,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-700/50',
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      }}
    />
  );
});

/**
 * Card skeleton for grid view items
 */
export const SkeletonCard = memo(function SkeletonCard({
  imageSize = 80,
  showImage = true,
  titleLines = 1,
  showActions = false,
  animation = 'pulse',
  className,
}: {
  imageSize?: number;
  showImage?: boolean;
  titleLines?: number;
  showActions?: boolean;
  animation?: SkeletonAnimation;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-gray-800/50 rounded-lg p-3 space-y-3',
        className
      )}
    >
      {showImage && (
        <Skeleton
          width="100%"
          height={imageSize}
          borderRadius={8}
          animation={animation}
        />
      )}
      <div className="space-y-2">
        {Array.from({ length: titleLines }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === titleLines - 1 ? '70%' : '100%'}
            height={14}
            animation={animation}
          />
        ))}
      </div>
      {showActions && (
        <div className="flex gap-2 pt-1">
          <Skeleton width={60} height={24} borderRadius={4} animation={animation} />
          <Skeleton width={60} height={24} borderRadius={4} animation={animation} />
        </div>
      )}
    </div>
  );
});

/**
 * List item skeleton for list view
 */
export const SkeletonListItem = memo(function SkeletonListItem({
  showImage = true,
  imageSize = 48,
  descriptionLines = 1,
  showActions = false,
  animation = 'pulse',
  className,
}: {
  showImage?: boolean;
  imageSize?: number;
  descriptionLines?: number;
  showActions?: boolean;
  animation?: SkeletonAnimation;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg',
        className
      )}
    >
      {showImage && (
        <Skeleton
          width={imageSize}
          height={imageSize}
          borderRadius={8}
          animation={animation}
        />
      )}
      <div className="flex-1 space-y-2">
        <Skeleton width="60%" height={16} animation={animation} />
        {Array.from({ length: descriptionLines }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === descriptionLines - 1 ? '40%' : '80%'}
            height={12}
            animation={animation}
          />
        ))}
      </div>
      {showActions && (
        <div className="flex gap-2">
          <Skeleton width={32} height={32} borderRadius={6} animation={animation} />
        </div>
      )}
    </div>
  );
});

/**
 * Compact skeleton for minimal display
 */
export const SkeletonCompact = memo(function SkeletonCompact({
  showImage = true,
  animation = 'pulse',
  className,
}: {
  showImage?: boolean;
  animation?: SkeletonAnimation;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 bg-gray-800/20 rounded',
        className
      )}
    >
      {showImage && (
        <Skeleton width={32} height={32} borderRadius={4} animation={animation} />
      )}
      <Skeleton width={100} height={14} animation={animation} />
    </div>
  );
});

/**
 * Grid skeleton layout
 */
export const SkeletonGrid = memo(function SkeletonGrid({
  count = 8,
  columns = 4,
  itemConfig,
  animation = 'pulse',
  gap = 8,
  className,
}: {
  count?: number;
  columns?: number;
  itemConfig?: SkeletonItemConfig;
  animation?: SkeletonAnimation;
  gap?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap}px`,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <SkeletonCard
            imageSize={itemConfig?.imageSize ?? 80}
            showImage={itemConfig?.showImage ?? true}
            titleLines={itemConfig?.titleLines ?? 1}
            showActions={itemConfig?.showActions ?? false}
            animation={animation}
          />
        </motion.div>
      ))}
    </div>
  );
});

/**
 * Skeleton List Component
 *
 * Renders a list of skeleton placeholders for loading states.
 * Supports multiple variants and animations.
 */
export const SkeletonList = memo(function SkeletonList({
  count = 5,
  itemConfig = {},
  gap = 8,
  animation = 'pulse',
  className,
  renderItem,
}: SkeletonListProps) {
  const { variant = 'list' } = itemConfig;

  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, index) => {
      if (renderItem) {
        return renderItem(index);
      }

      switch (variant) {
        case 'card':
          return (
            <SkeletonCard
              key={index}
              imageSize={itemConfig.imageSize ?? 80}
              showImage={itemConfig.showImage ?? true}
              titleLines={itemConfig.titleLines ?? 1}
              showActions={itemConfig.showActions ?? false}
              animation={animation}
            />
          );
        case 'compact':
          return (
            <SkeletonCompact
              key={index}
              showImage={itemConfig.showImage ?? true}
              animation={animation}
            />
          );
        case 'list':
        default:
          return (
            <SkeletonListItem
              key={index}
              showImage={itemConfig.showImage ?? true}
              imageSize={itemConfig.imageSize ?? 48}
              descriptionLines={itemConfig.descriptionLines ?? 1}
              showActions={itemConfig.showActions ?? false}
              animation={animation}
            />
          );
      }
    });
  }, [count, itemConfig, variant, animation, renderItem]);

  return (
    <div
      className={cn('space-y-2', className)}
      style={{ gap: `${gap}px` }}
    >
      {items.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03, duration: 0.2 }}
        >
          {item}
        </motion.div>
      ))}
    </div>
  );
});

/**
 * Inline loading skeleton for text
 */
export const SkeletonText = memo(function SkeletonText({
  lines = 3,
  animation = 'pulse',
  className,
}: {
  lines?: number;
  animation?: SkeletonAnimation;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={14}
          animation={animation}
        />
      ))}
    </div>
  );
});

/**
 * Avatar skeleton
 */
export const SkeletonAvatar = memo(function SkeletonAvatar({
  size = 40,
  animation = 'pulse',
  className,
}: {
  size?: number;
  animation?: SkeletonAnimation;
  className?: string;
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius="50%"
      animation={animation}
      className={className}
    />
  );
});

export default SkeletonList;
