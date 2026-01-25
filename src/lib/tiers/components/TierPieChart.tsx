'use client';

/**
 * TierPieChart
 * Circular/donut chart visualization for tier distribution
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TierDefinition, TierStats } from '../types';
import { TierChartData } from './TierChart';

/**
 * Pie chart configuration
 */
export interface TierPieChartConfig {
  /** Chart size (width and height) */
  size?: number;
  /** Inner radius for donut chart (0 for pie) */
  innerRadius?: number;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Show value labels */
  showLabels?: boolean;
  /** Show percentage labels */
  showPercentages?: boolean;
  /** Show center summary */
  showCenterSummary?: boolean;
  /** Interactive mode */
  interactive?: boolean;
  /** Stroke width between segments */
  strokeWidth?: number;
}

interface TierPieChartProps {
  /** Chart data */
  data: TierChartData[];
  /** Configuration options */
  config?: TierPieChartConfig;
  /** Called when a segment is clicked */
  onSegmentClick?: (tier: TierDefinition, stats: TierStats) => void;
  /** Called when segment is hovered */
  onSegmentHover?: (tier: TierDefinition | null) => void;
  /** Currently selected tier ID */
  selectedTierId?: string;
  /** Custom class name */
  className?: string;
}

const defaultConfig: TierPieChartConfig = {
  size: 200,
  innerRadius: 0.6,  // 0 = pie, 0-1 = donut
  animationDuration: 600,
  showLabels: true,
  showPercentages: true,
  showCenterSummary: true,
  interactive: true,
  strokeWidth: 2,
};

/**
 * Calculate pie segment path
 */
function describeArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  if (innerRadius === 0) {
    // Pie segment (no inner radius)
    return [
      'M', cx, cy,
      'L', endOuter.x, endOuter.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 1, startOuter.x, startOuter.y,
      'Z'
    ].join(' ');
  }

  // Donut segment
  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    'Z'
  ].join(' ');
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

/**
 * Animated pie segment
 */
const PieSegment = memo(function PieSegment({
  tier,
  stats,
  startAngle,
  endAngle,
  cx,
  cy,
  outerRadius,
  innerRadius,
  isSelected,
  isHovered,
  onClick,
  onHoverStart,
  onHoverEnd,
  config,
  index,
}: {
  tier: TierDefinition;
  stats: TierStats;
  startAngle: number;
  endAngle: number;
  cx: number;
  cy: number;
  outerRadius: number;
  innerRadius: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  config: TierPieChartConfig;
  index: number;
}) {
  const path = useMemo(
    () => describeArc(cx, cy, outerRadius, innerRadius, startAngle, endAngle),
    [cx, cy, outerRadius, innerRadius, startAngle, endAngle]
  );

  // Calculate label position (middle of arc, outside)
  const midAngle = (startAngle + endAngle) / 2;
  const labelRadius = outerRadius + 15;
  const labelPos = polarToCartesian(cx, cy, labelRadius, midAngle);

  // Segment size (for small segment handling)
  const arcSize = endAngle - startAngle;
  const showLabel = config.showLabels && arcSize > 20;

  return (
    <g>
      {/* Segment */}
      <motion.path
        d={path}
        fill={tier.color.primary}
        stroke="var(--background)"
        strokeWidth={config.strokeWidth}
        style={{
          filter: isHovered || isSelected ? `drop-shadow(${tier.color.glow})` : undefined,
          cursor: config.interactive ? 'pointer' : 'default',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: isHovered ? 1.05 : 1,
          opacity: 1,
        }}
        transition={{
          scale: { type: 'spring', stiffness: 300, damping: 20 },
          opacity: { delay: index * 0.05, duration: 0.3 },
          default: { delay: index * 0.05 },
        }}
        onClick={config.interactive ? onClick : undefined}
        onMouseEnter={config.interactive ? onHoverStart : undefined}
        onMouseLeave={config.interactive ? onHoverEnd : undefined}
        whileHover={config.interactive ? { scale: 1.05 } : undefined}
      />

      {/* Label */}
      {showLabel && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + index * 0.05 }}
        >
          {/* Label line */}
          <line
            x1={polarToCartesian(cx, cy, outerRadius, midAngle).x}
            y1={polarToCartesian(cx, cy, outerRadius, midAngle).y}
            x2={labelPos.x}
            y2={labelPos.y}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.3}
          />

          {/* Label text */}
          <text
            x={labelPos.x}
            y={labelPos.y}
            textAnchor={midAngle > 180 ? 'end' : 'start'}
            dominantBaseline="middle"
            className="text-xs fill-current"
          >
            <tspan className="font-bold">{tier.label}</tspan>
            {config.showPercentages && (
              <tspan className="opacity-60" dx="4">
                {Math.round((stats.filledCount / stats.itemCount) * 100) || 0}%
              </tspan>
            )}
          </text>
        </motion.g>
      )}
    </g>
  );
});

/**
 * Center summary for donut chart
 */
function CenterSummary({
  data,
  cx,
  cy,
  hoveredTier,
}: {
  data: TierChartData[];
  cx: number;
  cy: number;
  hoveredTier: TierChartData | null;
}) {
  const totalFilled = data.reduce((sum, d) => sum + d.stats.filledCount, 0);
  const totalCapacity = data.reduce((sum, d) => sum + d.stats.itemCount, 0);
  const fillPercentage = totalCapacity > 0 ? Math.round((totalFilled / totalCapacity) * 100) : 0;

  return (
    <AnimatePresence mode="wait">
      <motion.g
        key={hoveredTier?.tier.id || 'summary'}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
      >
        {hoveredTier ? (
          // Hovered tier info
          <>
            <text
              x={cx}
              y={cy - 12}
              textAnchor="middle"
              className="text-2xl font-bold fill-current"
              style={{ fill: hoveredTier.tier.color.primary }}
            >
              {hoveredTier.tier.label}
            </text>
            <text
              x={cx}
              y={cy + 8}
              textAnchor="middle"
              className="text-sm fill-current opacity-70"
            >
              {hoveredTier.stats.filledCount} / {hoveredTier.stats.itemCount}
            </text>
            <text
              x={cx}
              y={cy + 24}
              textAnchor="middle"
              className="text-xs fill-current opacity-50"
            >
              {hoveredTier.stats.percentage}% filled
            </text>
          </>
        ) : (
          // Overall summary
          <>
            <text
              x={cx}
              y={cy - 8}
              textAnchor="middle"
              className="text-3xl font-bold fill-current"
            >
              {fillPercentage}%
            </text>
            <text
              x={cx}
              y={cy + 12}
              textAnchor="middle"
              className="text-xs fill-current opacity-50"
            >
              {totalFilled} / {totalCapacity}
            </text>
          </>
        )}
      </motion.g>
    </AnimatePresence>
  );
}

/**
 * TierPieChart component
 */
export const TierPieChart = memo(function TierPieChart({
  data,
  config: userConfig,
  onSegmentClick,
  onSegmentHover,
  selectedTierId,
  className,
}: TierPieChartProps) {
  const config = { ...defaultConfig, ...userConfig };
  const [hoveredTierId, setHoveredTierId] = useState<string | null>(null);

  const { size, innerRadius: innerRatio } = config;
  const cx = size! / 2;
  const cy = size! / 2;
  const outerRadius = (size! - 60) / 2;  // Leave room for labels
  const innerRadius = outerRadius * innerRatio!;

  // Calculate segment angles
  const segments = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.stats.filledCount, 0);
    if (total === 0) {
      // Show equal empty segments
      const anglePerSegment = 360 / data.length;
      return data.map((d, i) => ({
        ...d,
        startAngle: i * anglePerSegment,
        endAngle: (i + 1) * anglePerSegment,
      }));
    }

    let currentAngle = 0;
    return data.map((d) => {
      const angle = (d.stats.filledCount / total) * 360;
      const segment = {
        ...d,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      };
      currentAngle += angle;
      return segment;
    });
  }, [data]);

  // Handle segment interactions
  const handleSegmentHover = useCallback(
    (tierId: string | null) => {
      setHoveredTierId(tierId);
      onSegmentHover?.(tierId ? data.find((d) => d.tier.id === tierId)?.tier || null : null);
    },
    [data, onSegmentHover]
  );

  const handleSegmentClick = useCallback(
    (tier: TierDefinition, stats: TierStats) => {
      onSegmentClick?.(tier, stats);
    },
    [onSegmentClick]
  );

  // Get hovered tier data
  const hoveredData = useMemo(() => {
    if (!hoveredTierId) return null;
    return data.find((d) => d.tier.id === hoveredTierId) || null;
  }, [hoveredTierId, data]);

  return (
    <div className={cn('relative', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Segments */}
        {segments.map((segment, index) => (
          <PieSegment
            key={segment.tier.id}
            tier={segment.tier}
            stats={segment.stats}
            startAngle={segment.startAngle}
            endAngle={segment.endAngle}
            cx={cx}
            cy={cy}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            isSelected={selectedTierId === segment.tier.id}
            isHovered={hoveredTierId === segment.tier.id}
            onClick={() => handleSegmentClick(segment.tier, segment.stats)}
            onHoverStart={() => handleSegmentHover(segment.tier.id)}
            onHoverEnd={() => handleSegmentHover(null)}
            config={config}
            index={index}
          />
        ))}

        {/* Center summary (for donut) */}
        {config.showCenterSummary && innerRadius > 0 && (
          <CenterSummary
            data={data}
            cx={cx}
            cy={cy}
            hoveredTier={hoveredData}
          />
        )}
      </svg>
    </div>
  );
});

/**
 * Mini donut chart
 */
export const TierDonutMini = memo(function TierDonutMini({
  data,
  size = 48,
  className,
}: {
  data: TierChartData[];
  size?: number;
  className?: string;
}) {
  return (
    <TierPieChart
      data={data}
      config={{
        size,
        innerRadius: 0.7,
        showLabels: false,
        showCenterSummary: false,
        interactive: false,
        strokeWidth: 1,
      }}
      className={className}
    />
  );
});

/**
 * Half-donut chart (semicircle)
 */
export const TierGaugeChart = memo(function TierGaugeChart({
  data,
  size = 200,
  className,
}: {
  data: TierChartData[];
  size?: number;
  className?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.stats.filledCount, 0);
  const capacity = data.reduce((sum, d) => sum + d.stats.itemCount, 0);
  const fillPercentage = capacity > 0 ? (total / capacity) * 100 : 0;

  const cx = size / 2;
  const cy = size * 0.7;
  const radius = size * 0.4;
  const innerRadius = radius * 0.7;

  // Calculate arc for fill percentage (180 degrees = 100%)
  const fillAngle = (fillPercentage / 100) * 180;

  const bgPath = describeArc(cx, cy, radius, innerRadius, 0, 180);
  const fillPath = describeArc(cx, cy, radius, innerRadius, 0, fillAngle);

  return (
    <div className={cn('relative', className)}>
      <svg
        width={size}
        height={size * 0.6}
        viewBox={`0 0 ${size} ${size * 0.6}`}
      >
        {/* Background arc */}
        <path
          d={bgPath}
          fill="currentColor"
          opacity={0.1}
        />

        {/* Filled arc - animated */}
        <motion.path
          d={fillPath}
          fill="url(#gaugeGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {data.map((d, i) => (
              <stop
                key={d.tier.id}
                offset={`${(i / (data.length - 1)) * 100}%`}
                stopColor={d.tier.color.primary}
              />
            ))}
          </linearGradient>
        </defs>

        {/* Center label */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          className="text-2xl font-bold fill-current"
        >
          {Math.round(fillPercentage)}%
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          className="text-xs fill-current opacity-50"
        >
          {total} / {capacity}
        </text>
      </svg>
    </div>
  );
});

export default TierPieChart;
