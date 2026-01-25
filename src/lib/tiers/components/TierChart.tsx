'use client';

/**
 * TierChart
 * Animated bar chart for tier distribution visualization
 */

import React, { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierDefinition, TierStats, TieredItem } from '../types';

/**
 * Data point for the chart
 */
export interface TierChartData {
  tier: TierDefinition;
  stats: TierStats;
  items?: TieredItem[];
}

/**
 * Chart configuration
 */
export interface TierChartConfig {
  /** Chart height in pixels */
  height?: number;
  /** Show value labels on bars */
  showValues?: boolean;
  /** Show percentage labels */
  showPercentages?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Bar corner radius */
  barRadius?: number;
  /** Gap between bars */
  barGap?: number;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Show grid lines */
  showGrid?: boolean;
  /** Interactive mode */
  interactive?: boolean;
}

interface TierChartProps {
  /** Chart data */
  data: TierChartData[];
  /** Configuration options */
  config?: TierChartConfig;
  /** Called when a bar is clicked */
  onBarClick?: (tier: TierDefinition, stats: TierStats) => void;
  /** Called when bar is hovered */
  onBarHover?: (tier: TierDefinition | null) => void;
  /** Currently selected tier ID */
  selectedTierId?: string;
  /** Custom class name */
  className?: string;
}

const defaultConfig: TierChartConfig = {
  height: 200,
  showValues: true,
  showPercentages: true,
  animationDuration: 500,
  barRadius: 8,
  barGap: 8,
  orientation: 'horizontal',
  showGrid: true,
  interactive: true,
};

/**
 * Animated number display
 */
function AnimatedNumber({
  value,
  duration = 500,
  suffix = '',
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration });
  const display = useTransform(spring, (v) => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return display.on('change', (v) => setDisplayValue(v));
  }, [display]);

  return (
    <span className={className}>
      {displayValue}{suffix}
    </span>
  );
}

/**
 * Individual animated bar
 */
const AnimatedBar = memo(function AnimatedBar({
  tier,
  stats,
  maxValue,
  config,
  isSelected,
  isHovered,
  onClick,
  onHoverStart,
  onHoverEnd,
  index,
}: {
  tier: TierDefinition;
  stats: TierStats;
  maxValue: number;
  config: TierChartConfig;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  index: number;
}) {
  const percentage = maxValue > 0 ? (stats.filledCount / maxValue) * 100 : 0;
  const fillPercentage = stats.itemCount > 0 ? (stats.filledCount / stats.itemCount) * 100 : 0;

  const isVertical = config.orientation === 'vertical';

  return (
    <motion.div
      className={cn(
        'relative flex items-center gap-3',
        isVertical && 'flex-col-reverse',
        config.interactive && 'cursor-pointer'
      )}
      onClick={config.interactive ? onClick : undefined}
      onHoverStart={config.interactive ? onHoverStart : undefined}
      onHoverEnd={config.interactive ? onHoverEnd : undefined}
      initial={{ opacity: 0, x: isVertical ? 0 : -20, y: isVertical ? 20 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      {/* Tier label */}
      <div
        className={cn(
          'flex items-center justify-center font-bold text-sm shrink-0',
          isVertical ? 'w-full h-8' : 'w-10 h-10'
        )}
        style={{
          background: tier.color.gradient,
          color: tier.color.text,
          borderRadius: config.barRadius,
        }}
      >
        {tier.label}
      </div>

      {/* Bar container */}
      <div
        className={cn(
          'relative flex-1 bg-muted/30 rounded-lg overflow-hidden',
          isVertical ? 'w-full' : 'h-10'
        )}
        style={{
          height: isVertical ? config.height : undefined,
          borderRadius: config.barRadius,
        }}
      >
        {/* Background capacity bar */}
        <div className="absolute inset-0 bg-muted/20" />

        {/* Filled bar */}
        <motion.div
          className="absolute"
          style={{
            background: tier.color.gradient,
            borderRadius: config.barRadius,
            boxShadow: isHovered || isSelected ? tier.color.glow : undefined,
            ...(isVertical
              ? {
                  bottom: 0,
                  left: 0,
                  right: 0,
                }
              : {
                  top: 0,
                  bottom: 0,
                  left: 0,
                }),
          }}
          initial={false}
          animate={{
            [isVertical ? 'height' : 'width']: `${percentage}%`,
            scale: isHovered ? 1.02 : 1,
          }}
          transition={{
            duration: config.animationDuration! / 1000,
            ease: [0.4, 0, 0.2, 1],
          }}
        />

        {/* Capacity indicator line */}
        {stats.itemCount > 0 && (
          <div
            className="absolute bg-foreground/20"
            style={{
              ...(isVertical
                ? {
                    bottom: `${(stats.itemCount / maxValue) * 100}%`,
                    left: 0,
                    right: 0,
                    height: 2,
                  }
                : {
                    left: `${(stats.itemCount / maxValue) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                  }),
            }}
          />
        )}

        {/* Value label inside bar */}
        {config.showValues && stats.filledCount > 0 && (
          <motion.div
            className={cn(
              'absolute flex items-center gap-1 text-xs font-medium',
              isVertical
                ? 'bottom-2 left-1/2 -translate-x-1/2'
                : 'right-2 top-1/2 -translate-y-1/2'
            )}
            style={{
              color: percentage > 30 ? tier.color.text : 'inherit',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <AnimatedNumber value={stats.filledCount} duration={config.animationDuration} />
            {config.showPercentages && (
              <span className="opacity-70">
                (<AnimatedNumber value={Math.round(fillPercentage)} suffix="%" duration={config.animationDuration} />)
              </span>
            )}
          </motion.div>
        )}
      </div>

      {/* External value label for empty or low-fill bars */}
      {config.showValues && stats.filledCount === 0 && (
        <span className="text-xs text-muted-foreground shrink-0">0</span>
      )}
    </motion.div>
  );
});

/**
 * Grid lines for the chart
 */
function ChartGrid({
  maxValue,
  orientation,
  height,
}: {
  maxValue: number;
  orientation: 'horizontal' | 'vertical';
  height: number;
}) {
  const gridLines = useMemo(() => {
    const lines = [];
    const step = Math.ceil(maxValue / 5);
    for (let i = step; i <= maxValue; i += step) {
      lines.push(i);
    }
    return lines;
  }, [maxValue]);

  const isVertical = orientation === 'vertical';

  return (
    <div className="absolute inset-0 pointer-events-none">
      {gridLines.map((value) => {
        const position = (value / maxValue) * 100;
        return (
          <div
            key={value}
            className="absolute border-dashed"
            style={{
              ...(isVertical
                ? {
                    bottom: `${position}%`,
                    left: 0,
                    right: 0,
                    borderTopWidth: 1,
                    borderColor: 'currentColor',
                    opacity: 0.1,
                  }
                : {
                    left: `${position}%`,
                    top: 0,
                    bottom: 0,
                    borderLeftWidth: 1,
                    borderColor: 'currentColor',
                    opacity: 0.1,
                  }),
            }}
          >
            <span
              className={cn(
                'absolute text-[10px] text-muted-foreground',
                isVertical ? '-top-3 left-0' : 'top-full mt-1'
              )}
            >
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Tooltip for hovered bar
 */
function ChartTooltip({
  tier,
  stats,
  position,
}: {
  tier: TierDefinition;
  stats: TierStats;
  position: { x: number; y: number };
}) {
  return (
    <motion.div
      className="fixed z-50 pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 10,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-4 h-4 rounded"
            style={{ background: tier.color.gradient }}
          />
          <span className="font-medium">{tier.displayName}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Filled:</span>
            <span className="font-medium">{stats.filledCount}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Capacity:</span>
            <span className="font-medium">{stats.itemCount}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Fill Rate:</span>
            <span className="font-medium">{stats.percentage}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * TierChart component
 */
export const TierChart = memo(function TierChart({
  data,
  config: userConfig,
  onBarClick,
  onBarHover,
  selectedTierId,
  className,
}: TierChartProps) {
  const config = { ...defaultConfig, ...userConfig };
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredTierId, setHoveredTierId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    return Math.max(
      ...data.map((d) => Math.max(d.stats.filledCount, d.stats.itemCount)),
      1
    );
  }, [data]);

  // Handle bar hover
  const handleBarHover = useCallback(
    (tierId: string | null, event?: React.MouseEvent) => {
      setHoveredTierId(tierId);
      if (event) {
        setTooltipPosition({ x: event.clientX, y: event.clientY });
      }
      onBarHover?.(tierId ? data.find((d) => d.tier.id === tierId)?.tier || null : null);
    },
    [data, onBarHover]
  );

  // Handle bar click
  const handleBarClick = useCallback(
    (tier: TierDefinition, stats: TierStats) => {
      onBarClick?.(tier, stats);
    },
    [onBarClick]
  );

  // Get hovered tier data
  const hoveredData = useMemo(() => {
    if (!hoveredTierId) return null;
    return data.find((d) => d.tier.id === hoveredTierId);
  }, [hoveredTierId, data]);

  const isVertical = config.orientation === 'vertical';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        isVertical && 'flex gap-4 items-end',
        className
      )}
      style={{ height: isVertical ? config.height : undefined }}
    >
      {/* Grid */}
      {config.showGrid && (
        <ChartGrid
          maxValue={maxValue}
          orientation={config.orientation!}
          height={config.height!}
        />
      )}

      {/* Bars */}
      <div
        className={cn(
          'relative',
          isVertical
            ? 'flex-1 flex gap-2 items-end h-full'
            : 'space-y-2'
        )}
        style={{
          paddingLeft: isVertical ? undefined : 56,
        }}
      >
        {data.map((item, index) => (
          <AnimatedBar
            key={item.tier.id}
            tier={item.tier}
            stats={item.stats}
            maxValue={maxValue}
            config={config}
            isSelected={selectedTierId === item.tier.id}
            isHovered={hoveredTierId === item.tier.id}
            onClick={() => handleBarClick(item.tier, item.stats)}
            onHoverStart={() => handleBarHover(item.tier.id)}
            onHoverEnd={() => handleBarHover(null)}
            index={index}
          />
        ))}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredData && (
          <ChartTooltip
            tier={hoveredData.tier}
            stats={hoveredData.stats}
            position={tooltipPosition}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Mini chart for compact displays
 */
export const TierChartMini = memo(function TierChartMini({
  data,
  className,
}: {
  data: TierChartData[];
  className?: string;
}) {
  const totalFilled = data.reduce((sum, d) => sum + d.stats.filledCount, 0);

  return (
    <div className={cn('flex items-center gap-1 h-6', className)}>
      {data.map((item) => {
        const width = totalFilled > 0
          ? (item.stats.filledCount / totalFilled) * 100
          : 100 / data.length;

        if (width < 1) return null;

        return (
          <motion.div
            key={item.tier.id}
            className="h-full rounded"
            style={{
              background: item.tier.color.gradient,
              minWidth: 4,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.5 }}
            title={`${item.tier.label}: ${item.stats.filledCount}`}
          />
        );
      })}
    </div>
  );
});

/**
 * Stacked bar chart variant
 */
export const TierChartStacked = memo(function TierChartStacked({
  data,
  height = 40,
  className,
}: {
  data: TierChartData[];
  height?: number;
  className?: string;
}) {
  const totalCapacity = data.reduce((sum, d) => sum + d.stats.itemCount, 0);
  const totalFilled = data.reduce((sum, d) => sum + d.stats.filledCount, 0);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Stacked bar */}
      <div
        className="flex rounded-lg overflow-hidden"
        style={{ height }}
      >
        {data.map((item, index) => {
          const width = totalCapacity > 0
            ? (item.stats.itemCount / totalCapacity) * 100
            : 100 / data.length;

          const fillRatio = item.stats.itemCount > 0
            ? item.stats.filledCount / item.stats.itemCount
            : 0;

          return (
            <motion.div
              key={item.tier.id}
              className="relative h-full"
              style={{ width: `${width}%` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Capacity background */}
              <div
                className="absolute inset-0 opacity-30"
                style={{ background: item.tier.color.primary }}
              />

              {/* Filled portion */}
              <motion.div
                className="absolute bottom-0 left-0 right-0"
                style={{ background: item.tier.color.gradient }}
                initial={{ height: 0 }}
                animate={{ height: `${fillRatio * 100}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />

              {/* Label */}
              <div
                className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                style={{ color: item.tier.color.text }}
              >
                {item.tier.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{totalFilled} filled</span>
        <span>{totalCapacity} capacity</span>
      </div>
    </div>
  );
});

export default TierChart;
