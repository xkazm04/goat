"use client";

import { useEffect, useState } from 'react';
import { useBacklogStore } from '@/stores/backlog-store';

/**
 * CoalescerMonitor - Development component for monitoring request coalescing performance
 *
 * This component displays real-time statistics about API request coalescing,
 * including cache hits, deduplication rate, and network savings.
 *
 * Usage:
 * Add this component to your layout or page during development to monitor performance.
 * Remove or disable in production.
 */
export function CoalescerMonitor() {
  const [stats, setStats] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = async () => {
      const coalescerStats = await useBacklogStore.getState().getCoalescerStats?.();
      if (coalescerStats) {
        setStats(coalescerStats);
      }
    };

    // Update stats every 2 seconds
    const interval = setInterval(updateStats, 2000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const { stats: rawStats, efficiency } = stats;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        data-testid="coalescer-monitor-toggle"
      >
        {isVisible ? '📊 Hide Stats' : '📊 Show Stats'}
      </button>

      {/* Stats Panel */}
      {isVisible && (
        <div
          className="fixed bottom-16 right-4 z-50 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg shadow-2xl border border-white/10 w-80"
          data-testid="coalescer-monitor-panel"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-blue-400">Request Coalescer Stats</h3>
            <button
              onClick={async () => {
                await useBacklogStore.getState().resetCoalescerStats?.();
                setStats(null);
              }}
              className="text-xs text-gray-400 hover:text-white transition-colors"
              data-testid="reset-stats-btn"
            >
              Reset
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* Total Requests */}
            <div className="flex justify-between">
              <span className="text-gray-400">Total Requests:</span>
              <span className="font-mono text-white">{rawStats.totalRequests}</span>
            </div>

            {/* Coalesced Requests */}
            <div className="flex justify-between">
              <span className="text-gray-400">Coalesced:</span>
              <span className="font-mono text-green-400">
                {rawStats.coalescedRequests} ({efficiency.coalescingRate.toFixed(1)}%)
              </span>
            </div>

            {/* Cache Hits */}
            <div className="flex justify-between">
              <span className="text-gray-400">Cache Hits:</span>
              <span className="font-mono text-blue-400">
                {rawStats.cacheHits} ({efficiency.cacheHitRate.toFixed(1)}%)
              </span>
            </div>

            {/* Network Savings */}
            <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
              <span className="text-gray-400 font-semibold">Network Savings:</span>
              <span className="font-mono text-yellow-400 font-bold">
                {efficiency.networkSavings} requests
              </span>
            </div>

            {/* Active Batches */}
            <div className="flex justify-between">
              <span className="text-gray-400">Active Batches:</span>
              <span className="font-mono text-purple-400">{rawStats.activeBatches}</span>
            </div>

            {/* Performance Indicator */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Performance:</span>
                <div className="flex items-center gap-2">
                  {efficiency.networkSavings > 10 && (
                    <span className="text-green-400 font-semibold">🚀 Excellent</span>
                  )}
                  {efficiency.networkSavings > 5 && efficiency.networkSavings <= 10 && (
                    <span className="text-yellow-400 font-semibold">⚡ Good</span>
                  )}
                  {efficiency.networkSavings <= 5 && (
                    <span className="text-gray-400 font-semibold">📊 Normal</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-500 text-center">
            Updates every 2 seconds
          </div>
        </div>
      )}
    </>
  );
}
