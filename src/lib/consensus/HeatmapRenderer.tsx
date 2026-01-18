"use client";

import {
  memo,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeatmapCell,
  HeatmapConfig,
  HeatmapViewMode,
  ConsensusBadge,
  DEFAULT_HEATMAP_COLORS,
  COLORBLIND_HEATMAP_COLORS,
} from "./types";

interface HeatmapRendererProps {
  cells: HeatmapCell[];
  config: HeatmapConfig;
  gridWidth: number;
  gridHeight: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  columns: number;
  onCellHover?: (cell: HeatmapCell | null) => void;
  onCellClick?: (cell: HeatmapCell) => void;
}

/**
 * HeatmapCanvas - WebGL/Canvas-based heatmap renderer for performance
 */
const HeatmapCanvas = memo(function HeatmapCanvas({
  cells,
  width,
  height,
  cellWidth,
  cellHeight,
  gap,
  columns,
  opacity,
  colorScheme,
}: {
  cells: HeatmapCell[];
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  columns: number;
  opacity: number;
  colorScheme: 'default' | 'colorblind' | 'monochrome';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Get colors based on scheme
  const colors = useMemo(() => {
    switch (colorScheme) {
      case 'colorblind':
        return COLORBLIND_HEATMAP_COLORS;
      case 'monochrome':
        return {
          ...DEFAULT_HEATMAP_COLORS,
          gradient: ['#ffffff', '#cccccc', '#999999', '#666666', '#333333'],
        };
      default:
        return DEFAULT_HEATMAP_COLORS;
    }
  }, [colorScheme]);

  // Render heatmap
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Render each cell
    for (const cell of cells) {
      const row = Math.floor(cell.position / columns);
      const col = cell.position % columns;

      const x = col * (cellWidth + gap);
      const y = row * (cellHeight + gap);

      // Apply opacity
      ctx.globalAlpha = opacity * cell.intensity.normalized;

      // Draw cell with gradient effect
      const gradient = ctx.createRadialGradient(
        x + cellWidth / 2,
        y + cellHeight / 2,
        0,
        x + cellWidth / 2,
        y + cellHeight / 2,
        Math.max(cellWidth, cellHeight) / 2
      );

      gradient.addColorStop(0, cell.color);
      gradient.addColorStop(1, `${cell.color}00`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, cellWidth, cellHeight);
    }

    ctx.globalAlpha = 1;
  }, [cells, width, height, cellWidth, cellHeight, gap, columns, opacity, colors]);

  // Animation loop
  useEffect(() => {
    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity }}
    />
  );
});

/**
 * HeatmapOverlay - CSS-based overlay for simpler rendering
 */
const HeatmapOverlay = memo(function HeatmapOverlay({
  cells,
  cellWidth,
  cellHeight,
  gap,
  columns,
  opacity,
  animateTransitions,
  showLabels,
  showBadges,
  onCellHover,
  onCellClick,
}: {
  cells: HeatmapCell[];
  cellWidth: number;
  cellHeight: number;
  gap: number;
  columns: number;
  opacity: number;
  animateTransitions: boolean;
  showLabels: boolean;
  showBadges: boolean;
  onCellHover?: (cell: HeatmapCell | null) => void;
  onCellClick?: (cell: HeatmapCell) => void;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {cells.map((cell) => {
        const row = Math.floor(cell.position / columns);
        const col = cell.position % columns;

        const x = col * (cellWidth + gap);
        const y = row * (cellHeight + gap);

        return (
          <motion.div
            key={cell.itemId || cell.position}
            className="absolute rounded-lg pointer-events-auto"
            style={{
              left: x,
              top: y,
              width: cellWidth,
              height: cellHeight,
              background: `radial-gradient(circle, ${cell.color}${Math.round(opacity * cell.intensity.normalized * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
            }}
            initial={animateTransitions ? { opacity: 0, scale: 0.8 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: cell.position * 0.01 }}
            onMouseEnter={() => onCellHover?.(cell)}
            onMouseLeave={() => onCellHover?.(null)}
            onClick={() => onCellClick?.(cell)}
          >
            {/* Consensus badge */}
            {showBadges && cell.badge && (
              <HeatmapBadge badge={cell.badge} />
            )}

            {/* Intensity label */}
            {showLabels && (
              <div
                className="absolute bottom-0 right-0 text-[8px] px-1 rounded-tl"
                style={{
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: cell.color,
                }}
              >
                {Math.round(cell.intensity.value)}%
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
});

/**
 * HeatmapBadge - Visual badge for special items
 */
const HeatmapBadge = memo(function HeatmapBadge({
  badge,
}: {
  badge: ConsensusBadge;
}) {
  return (
    <motion.div
      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-lg z-10"
      style={{
        background: badge.color,
        color: 'white',
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.2 }}
      title={badge.tooltip}
    >
      {badge.icon || badge.label[0]}
    </motion.div>
  );
});

/**
 * HeatmapLegend - Color scale legend
 */
export const HeatmapLegend = memo(function HeatmapLegend({
  mode,
  colorScheme,
}: {
  mode: HeatmapViewMode;
  colorScheme: 'default' | 'colorblind' | 'monochrome';
}) {
  const colors =
    colorScheme === 'colorblind'
      ? COLORBLIND_HEATMAP_COLORS
      : DEFAULT_HEATMAP_COLORS;

  const labels = {
    consensus: { high: 'High Consensus', low: 'Low Consensus' },
    controversy: { high: 'Most Debated', low: 'Agreed Upon' },
    yourPick: { high: 'Big Difference', low: 'Matches Community' },
    variance: { high: 'High Variance', low: 'Low Variance' },
    trending: { high: 'Rising Fast', low: 'Stable' },
    off: { high: '', low: '' },
  };

  const currentLabels = labels[mode] || labels.consensus;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
      <span className="text-xs text-slate-400">{currentLabels.low}</span>
      <div
        className="h-3 w-32 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${colors.gradient.join(', ')})`,
        }}
      />
      <span className="text-xs text-slate-400">{currentLabels.high}</span>
    </div>
  );
});

/**
 * HeatmapTooltip - Detailed info on hover
 */
export const HeatmapTooltip = memo(function HeatmapTooltip({
  cell,
  visible,
  x,
  y,
}: {
  cell: HeatmapCell | null;
  visible: boolean;
  x: number;
  y: number;
}) {
  if (!cell || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed z-50 p-3 rounded-xl shadow-xl pointer-events-none"
        style={{
          left: x + 10,
          top: y + 10,
          background: 'rgba(30, 41, 59, 0.95)',
          border: `1px solid ${cell.color}50`,
          backdropFilter: 'blur(8px)',
        }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
      >
        {/* Position */}
        <div className="text-white font-semibold mb-1">
          Position #{cell.position + 1}
        </div>

        {/* Consensus level */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: cell.color }}
          />
          <span className="text-sm text-slate-300 capitalize">
            {cell.consensusLevel} consensus
          </span>
        </div>

        {/* Intensity */}
        <div className="text-xs text-slate-400">
          Intensity: {Math.round(cell.intensity.value)}%
        </div>

        {/* Badge info */}
        {cell.badge && (
          <div
            className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-2"
          >
            <span style={{ color: cell.badge.color }}>{cell.badge.icon}</span>
            <span className="text-xs text-slate-300">{cell.badge.label}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Main HeatmapRenderer Component
 */
export const HeatmapRenderer = memo(function HeatmapRenderer({
  cells,
  config,
  gridWidth,
  gridHeight,
  cellWidth,
  cellHeight,
  gap,
  columns,
  onCellHover,
  onCellClick,
}: HeatmapRendererProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Handle hover
  const handleCellHover = useCallback(
    (cell: HeatmapCell | null) => {
      setHoveredCell(cell);
      onCellHover?.(cell);
    },
    [onCellHover]
  );

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!config.enabled || config.mode === 'off') {
    return null;
  }

  // Use WebGL canvas for large datasets, CSS overlay for smaller ones
  const useCanvas = cells.length > 100;

  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          width: gridWidth,
          height: gridHeight,
        }}
      >
        {useCanvas ? (
          <HeatmapCanvas
            cells={cells}
            width={gridWidth}
            height={gridHeight}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            gap={gap}
            columns={columns}
            opacity={config.opacity}
            colorScheme={config.colorScheme}
          />
        ) : (
          <HeatmapOverlay
            cells={cells}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            gap={gap}
            columns={columns}
            opacity={config.opacity}
            animateTransitions={config.animateTransitions}
            showLabels={config.showLabels}
            showBadges={config.showBadges}
            onCellHover={handleCellHover}
            onCellClick={onCellClick}
          />
        )}
      </div>

      {/* Tooltip */}
      <HeatmapTooltip
        cell={hoveredCell}
        visible={hoveredCell !== null}
        x={mousePos.x}
        y={mousePos.y}
      />
    </>
  );
});

export default HeatmapRenderer;
