'use client';

/**
 * PerformanceMonitor
 * Component for tracking and displaying FPS and render performance metrics.
 * Useful for development and debugging virtual scroll performance.
 */

import React, {
  memo,
  useRef,
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Activity, Cpu, Layers, Clock, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Performance metrics structure
 */
export interface PerformanceMetrics {
  /** Current frames per second */
  fps: number;
  /** Average FPS over sample period */
  avgFps: number;
  /** Minimum FPS recorded */
  minFps: number;
  /** Maximum FPS recorded */
  maxFps: number;
  /** Frame time in milliseconds */
  frameTime: number;
  /** Number of DOM nodes in monitored area */
  domNodes: number;
  /** Memory usage (if available) */
  memoryUsage?: number;
  /** Time since last render */
  timeSinceRender: number;
  /** Total renders counted */
  renderCount: number;
  /** Jank frames (>16ms) */
  jankFrames: number;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  /** FPS below this is considered poor */
  poorFps: number;
  /** FPS below this is considered fair */
  fairFps: number;
  /** Frame time above this is considered poor (ms) */
  poorFrameTime: number;
  /** DOM nodes above this is considered high */
  highDomNodes: number;
}

/**
 * Default thresholds
 */
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  poorFps: 30,
  fairFps: 50,
  poorFrameTime: 33,
  highDomNodes: 100,
};

/**
 * Props for PerformanceMonitor component
 */
export interface PerformanceMonitorProps {
  /** Whether to show the monitor */
  visible?: boolean;
  /** Position on screen */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Element to monitor (for DOM node count) */
  targetRef?: React.RefObject<HTMLElement>;
  /** Performance thresholds */
  thresholds?: Partial<PerformanceThresholds>;
  /** Callback when metrics update */
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  /** Sample rate in ms */
  sampleRate?: number;
  /** Whether to show expanded view */
  defaultExpanded?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Get color based on FPS value
 */
function getFpsColor(fps: number, thresholds: PerformanceThresholds): string {
  if (fps >= thresholds.fairFps) return 'text-green-400';
  if (fps >= thresholds.poorFps) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Get color based on frame time
 */
function getFrameTimeColor(frameTime: number, thresholds: PerformanceThresholds): string {
  if (frameTime <= 16) return 'text-green-400';
  if (frameTime <= thresholds.poorFrameTime) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Get color based on DOM nodes
 */
function getDomColor(nodes: number, thresholds: PerformanceThresholds): string {
  if (nodes <= 50) return 'text-green-400';
  if (nodes <= thresholds.highDomNodes) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Format memory size
 */
function formatMemory(bytes?: number): string {
  if (!bytes) return 'N/A';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * PerformanceMonitor Component
 *
 * Real-time performance monitoring overlay for development.
 * Tracks FPS, frame time, DOM nodes, and memory usage.
 *
 * Features:
 * - Real-time FPS tracking
 * - Frame time measurement
 * - DOM node counting
 * - Memory usage (Chrome only)
 * - Jank detection
 * - Collapsible UI
 */
export const PerformanceMonitor = memo(function PerformanceMonitor({
  visible = true,
  position = 'bottom-right',
  targetRef,
  thresholds: customThresholds,
  onMetricsUpdate,
  sampleRate = 100,
  defaultExpanded = false,
  className,
}: PerformanceMonitorProps) {
  const frameRef = useRef<number>(0);
  const lastFrameTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);
  const renderCount = useRef(0);
  const jankFrames = useRef(0);

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    avgFps: 60,
    minFps: 60,
    maxFps: 60,
    frameTime: 16.67,
    domNodes: 0,
    timeSinceRender: 0,
    renderCount: 0,
    jankFrames: 0,
  });
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };

  // Position classes
  const positionClasses: Record<string, string> = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  // Update metrics
  const updateMetrics = useCallback(() => {
    const now = performance.now();
    const deltaTime = now - lastFrameTime.current;
    lastFrameTime.current = now;

    // Calculate FPS
    const fps = Math.round(1000 / deltaTime);
    fpsHistory.current.push(fps);

    // Keep last 60 samples
    if (fpsHistory.current.length > 60) {
      fpsHistory.current.shift();
    }

    // Check for jank
    if (deltaTime > 16.67) {
      jankFrames.current++;
    }

    // Calculate stats
    const avgFps = Math.round(
      fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
    );
    const minFps = Math.min(...fpsHistory.current);
    const maxFps = Math.max(...fpsHistory.current);

    // Count DOM nodes
    let domNodes = 0;
    if (targetRef?.current) {
      domNodes = targetRef.current.querySelectorAll('*').length;
    }

    // Get memory usage (Chrome only)
    let memoryUsage: number | undefined;
    // @ts-expect-error - memory API is Chrome-specific
    if (performance.memory) {
      // @ts-expect-error - memory API is Chrome-specific
      memoryUsage = performance.memory.usedJSHeapSize;
    }

    renderCount.current++;

    const newMetrics: PerformanceMetrics = {
      fps: Math.min(fps, 60),
      avgFps: Math.min(avgFps, 60),
      minFps: Math.min(minFps, 60),
      maxFps: Math.min(maxFps, 60),
      frameTime: deltaTime,
      domNodes,
      memoryUsage,
      timeSinceRender: deltaTime,
      renderCount: renderCount.current,
      jankFrames: jankFrames.current,
    };

    setMetrics(newMetrics);
    onMetricsUpdate?.(newMetrics);
  }, [targetRef, onMetricsUpdate]);

  // Animation frame loop
  useEffect(() => {
    if (!visible) return;

    let lastUpdate = performance.now();

    const loop = () => {
      const now = performance.now();

      if (now - lastUpdate >= sampleRate) {
        updateMetrics();
        lastUpdate = now;
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [visible, sampleRate, updateMetrics]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'fixed z-[9999] bg-black/90 backdrop-blur-sm rounded-lg border border-gray-700/50 shadow-xl',
        'font-mono text-xs',
        positionClasses[position],
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-800/50 rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span className={cn('font-bold', getFpsColor(metrics.fps, thresholds))}>
            {metrics.fps} FPS
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-gray-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-gray-700/50">
              {/* FPS Details */}
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-gray-400">
                  <span>Avg FPS</span>
                  <span className={getFpsColor(metrics.avgFps, thresholds)}>
                    {metrics.avgFps}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Min/Max</span>
                  <span>
                    <span className={getFpsColor(metrics.minFps, thresholds)}>
                      {metrics.minFps}
                    </span>
                    {' / '}
                    <span className={getFpsColor(metrics.maxFps, thresholds)}>
                      {metrics.maxFps}
                    </span>
                  </span>
                </div>
              </div>

              {/* Frame Time */}
              <div className="flex items-center justify-between text-gray-400 pt-1 border-t border-gray-700/30">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Frame</span>
                </div>
                <span className={getFrameTimeColor(metrics.frameTime, thresholds)}>
                  {metrics.frameTime.toFixed(1)}ms
                </span>
              </div>

              {/* DOM Nodes */}
              <div className="flex items-center justify-between text-gray-400">
                <div className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>DOM</span>
                </div>
                <span className={getDomColor(metrics.domNodes, thresholds)}>
                  {metrics.domNodes} nodes
                </span>
              </div>

              {/* Memory */}
              {metrics.memoryUsage && (
                <div className="flex items-center justify-between text-gray-400">
                  <div className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    <span>Memory</span>
                  </div>
                  <span className="text-gray-300">
                    {formatMemory(metrics.memoryUsage)}
                  </span>
                </div>
              )}

              {/* Jank */}
              <div className="flex items-center justify-between text-gray-400 pt-1 border-t border-gray-700/30">
                <span>Jank frames</span>
                <span className={metrics.jankFrames > 10 ? 'text-red-400' : 'text-gray-300'}>
                  {metrics.jankFrames}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

/**
 * Performance context for sharing metrics
 */
interface PerformanceContextValue {
  metrics: PerformanceMetrics | null;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

const PerformanceContext = createContext<PerformanceContextValue>({
  metrics: null,
  isMonitoring: false,
  startMonitoring: () => {},
  stopMonitoring: () => {},
});

/**
 * Hook to access performance context
 */
export function usePerformanceMetrics(): PerformanceContextValue {
  return useContext(PerformanceContext);
}

/**
 * Provider for performance monitoring
 */
export function PerformanceProvider({
  children,
  autoStart = false,
}: {
  children: React.ReactNode;
  autoStart?: boolean;
}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(autoStart);

  const startMonitoring = useCallback(() => setIsMonitoring(true), []);
  const stopMonitoring = useCallback(() => setIsMonitoring(false), []);

  return (
    <PerformanceContext.Provider
      value={{
        metrics,
        isMonitoring,
        startMonitoring,
        stopMonitoring,
      }}
    >
      {children}
      {isMonitoring && (
        <PerformanceMonitor
          visible={true}
          onMetricsUpdate={setMetrics}
        />
      )}
    </PerformanceContext.Provider>
  );
}

export default PerformanceMonitor;
