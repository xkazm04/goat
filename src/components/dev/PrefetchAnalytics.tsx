/**
 * PrefetchAnalytics
 *
 * Development-only component for monitoring prefetch system performance.
 * Displays real-time analytics, network conditions, and queue status.
 *
 * Only renders in development mode.
 */

'use client';

import { useState, useEffect } from 'react';
import { PrefetchManager, type PrefetchAnalytics as Analytics } from '@/lib/prefetch/PrefetchManager';
import { BandwidthDetector, type NetworkConditions } from '@/lib/prefetch/BandwidthDetector';
import { ScrollPrefetcher } from '@/lib/prefetch/ScrollPrefetcher';
import { HoverPrefetcher } from '@/lib/prefetch/HoverPrefetcher';

interface PrefetchAnalyticsProps {
  /** Position of the panel */
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  /** Whether to show the panel initially */
  defaultOpen?: boolean;
}

export function PrefetchAnalytics({
  position = 'bottom-right',
  defaultOpen = false,
}: PrefetchAnalyticsProps) {
  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return <PrefetchAnalyticsPanel position={position} defaultOpen={defaultOpen} />;
}

function PrefetchAnalyticsPanel({
  position,
  defaultOpen,
}: Required<PrefetchAnalyticsProps>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [network, setNetwork] = useState<NetworkConditions | null>(null);
  const [queueStats, setQueueStats] = useState<{
    queued: number;
    processing: number;
    processed: number;
  } | null>(null);

  // Update stats periodically
  useEffect(() => {
    if (!isOpen) return;

    const updateStats = () => {
      setAnalytics(PrefetchManager.getAnalytics());
      setNetwork(BandwidthDetector.getNetworkConditions());
      setQueueStats(PrefetchManager.getQueueStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const strategyColors = {
    aggressive: 'text-green-400',
    moderate: 'text-yellow-400',
    conservative: 'text-orange-400',
    disabled: 'text-red-400',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-9999 font-mono text-xs`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 border border-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
        title="Prefetch Analytics"
      >
        📡 {isOpen ? '−' : '+'}
      </button>

      {/* Panel */}
      {isOpen && analytics && network && queueStats && (
        <div className="mt-2 bg-gray-900/95 border border-gray-700 rounded-lg p-3 w-72 max-h-96 overflow-auto shadow-xl">
          <div className="font-bold text-brand-hover mb-2 flex items-center justify-between">
            <span>Prefetch Analytics</span>
            <button
              onClick={() => PrefetchManager.resetAnalytics()}
              className="text-gray-500 hover:text-gray-300 text-[10px]"
            >
              Reset
            </button>
          </div>

          {/* Network Status */}
          <div className="mb-3">
            <div className="text-gray-400 text-[10px] uppercase mb-1">Network</div>
            <div className="grid grid-cols-2 gap-1 text-gray-300">
              <span>Type:</span>
              <span className="text-right">{network.connectionType}</span>
              <span>Downlink:</span>
              <span className="text-right">{network.downlink.toFixed(1)} Mbps</span>
              <span>RTT:</span>
              <span className="text-right">{network.rtt}ms</span>
              <span>Strategy:</span>
              <span className={`text-right ${strategyColors[network.recommendedStrategy]}`}>
                {network.recommendedStrategy}
              </span>
              <span>Data Saver:</span>
              <span className="text-right">{network.saveData ? '✓' : '✗'}</span>
            </div>
          </div>

          {/* Queue Status */}
          <div className="mb-3">
            <div className="text-gray-400 text-[10px] uppercase mb-1">Queue</div>
            <div className="grid grid-cols-2 gap-1 text-gray-300">
              <span>Queued:</span>
              <span className="text-right">{queueStats.queued}</span>
              <span>Processing:</span>
              <span className="text-right text-yellow-400">{queueStats.processing}</span>
              <span>Processed:</span>
              <span className="text-right text-green-400">{queueStats.processed}</span>
            </div>
          </div>

          {/* Prefetch Stats */}
          <div className="mb-3">
            <div className="text-gray-400 text-[10px] uppercase mb-1">Prefetch Stats</div>
            <div className="grid grid-cols-2 gap-1 text-gray-300">
              <span>Total Queued:</span>
              <span className="text-right">{analytics.totalQueued}</span>
              <span>Completed:</span>
              <span className="text-right text-green-400">{analytics.completed}</span>
              <span>Failed:</span>
              <span className="text-right text-red-400">{analytics.failed}</span>
              <span>Cache Hits:</span>
              <span className="text-right text-brand-hover">{analytics.hits}</span>
              <span>Hit Rate:</span>
              <span className="text-right font-bold">
                {analytics.hitRate.toFixed(1)}%
              </span>
              <span>BW Skips:</span>
              <span className="text-right text-orange-400">
                {analytics.bandwidthSkips}
              </span>
            </div>
          </div>

          {/* By Source */}
          {Object.keys(analytics.bySource).length > 0 && (
            <div className="mb-3">
              <div className="text-gray-400 text-[10px] uppercase mb-1">By Source</div>
              <div className="space-y-1">
                {Object.entries(analytics.bySource).map(([source, stats]) => (
                  <div key={source} className="flex items-center justify-between text-gray-300">
                    <span className="capitalize">{source}</span>
                    <span className="text-[10px]">
                      Q:{stats.queued} C:{stats.completed} H:{stats.hits}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registered Elements */}
          <div className="text-gray-400 text-[10px] border-t border-gray-700 pt-2 mt-2">
            Hover: {HoverPrefetcher.getRegisteredCount()} |
            Scroll: {ScrollPrefetcher.getTrackedCount()}
          </div>
        </div>
      )}
    </div>
  );
}

export default PrefetchAnalytics;
