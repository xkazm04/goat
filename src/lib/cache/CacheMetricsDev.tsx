/**
 * CacheMetricsDev - Development-only cache metrics dashboard
 *
 * Displays real-time cache statistics including hit rates, memory usage,
 * and invalidation history. Only rendered in development mode.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, RefreshCw, Trash2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { getCacheMetrics, resetCacheMetrics, getPendingRequestCount } from './query-cache-config';
import { getGlobalAPICache } from './api-cache';
import { formatTTL, CACHE_TTL_MS } from './unified-cache';

interface MetricsState {
  queryCache: ReturnType<typeof getCacheMetrics>;
  apiCache: ReturnType<typeof getGlobalAPICache>['getMetrics'] extends () => infer R ? R : never;
  pendingRequests: number;
}

export function CacheMetricsDev() {
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState<MetricsState | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Update metrics every second when panel is open
  useEffect(() => {
    if (!isOpen) return;

    const updateMetrics = () => {
      try {
        const apiCache = getGlobalAPICache();
        setMetrics({
          queryCache: getCacheMetrics(),
          apiCache: apiCache.getMetrics(),
          pendingRequests: getPendingRequestCount(),
        });
      } catch (e) {
        console.warn('[CacheMetrics] Failed to get metrics:', e);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleReset = () => {
    resetCacheMetrics();
    const apiCache = getGlobalAPICache();
    apiCache.resetMetrics();
  };

  const handleClearAll = () => {
    const apiCache = getGlobalAPICache();
    apiCache.invalidate({ all: true });
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-4 z-50 p-3 bg-gray-800 hover:bg-gray-700 rounded-full shadow-lg border border-gray-700"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Cache Metrics"
      >
        <BarChart3 className="w-5 h-5 text-blue-400" />
      </motion.button>

      {/* Metrics Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 left-4 z-50 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="font-medium text-white text-sm">Cache Metrics</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  title="Reset Metrics"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClearAll}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                  title="Clear All Cache"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {metrics && (
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Query Hit Rate"
                    value={`${metrics.queryCache.hitRate.toFixed(1)}%`}
                    color={metrics.queryCache.hitRate > 80 ? 'green' : metrics.queryCache.hitRate > 50 ? 'yellow' : 'red'}
                  />
                  <StatCard
                    label="API Hit Rate"
                    value={`${metrics.apiCache.hitRate.toFixed(1)}%`}
                    color={metrics.apiCache.hitRate > 80 ? 'green' : metrics.apiCache.hitRate > 50 ? 'yellow' : 'red'}
                  />
                  <StatCard
                    label="Total Queries"
                    value={metrics.queryCache.totalQueries.toString()}
                    color="blue"
                  />
                  <StatCard
                    label="In-Flight"
                    value={metrics.pendingRequests.toString()}
                    color="purple"
                  />
                </div>

                {/* Detailed Stats */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center justify-between w-full text-sm text-gray-400 hover:text-white"
                >
                  <span>Detailed Stats</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {isExpanded && (
                  <div className="space-y-3 text-xs">
                    {/* Query Cache */}
                    <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
                      <div className="font-medium text-gray-300">React Query Cache</div>
                      <div className="grid grid-cols-2 gap-2 text-gray-400">
                        <div>Hits: <span className="text-green-400">{metrics.queryCache.hits}</span></div>
                        <div>Misses: <span className="text-red-400">{metrics.queryCache.misses}</span></div>
                        <div>Mutations: <span className="text-blue-400">{metrics.queryCache.mutations}</span></div>
                        <div>Invalidations: <span className="text-yellow-400">{metrics.queryCache.invalidations}</span></div>
                        <div>Errors: <span className="text-red-400">{metrics.queryCache.errors}</span></div>
                        <div>Uptime: <span className="text-gray-300">{formatUptime(metrics.queryCache.uptime)}</span></div>
                      </div>
                    </div>

                    {/* API Cache */}
                    <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
                      <div className="font-medium text-gray-300">API Cache</div>
                      <div className="grid grid-cols-2 gap-2 text-gray-400">
                        <div>Entries: <span className="text-blue-400">{metrics.apiCache.currentEntries}</span></div>
                        <div>Size: <span className="text-purple-400">{formatBytes(metrics.apiCache.totalSize)}</span></div>
                        <div>Evictions: <span className="text-yellow-400">{metrics.apiCache.evictions}</span></div>
                        <div>Coalesced: <span className="text-green-400">{metrics.apiCache.coalescedRequests}</span></div>
                        <div>Saved: <span className="text-green-400">{metrics.apiCache.networkSavings} reqs</span></div>
                        <div>Avg Age: <span className="text-gray-300">{formatTTL(metrics.apiCache.averageEntryAge)}</span></div>
                      </div>
                    </div>

                    {/* TTL Reference */}
                    <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
                      <div className="font-medium text-gray-300">Unified TTLs</div>
                      <div className="grid grid-cols-2 gap-1 text-gray-400">
                        {Object.entries(CACHE_TTL_MS).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            {key}: <span className="text-gray-300">{formatTTL(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
}) {
  const colorClasses = {
    green: 'text-green-400 bg-green-900/20',
    yellow: 'text-yellow-400 bg-yellow-900/20',
    red: 'text-red-400 bg-red-900/20',
    blue: 'text-blue-400 bg-blue-900/20',
    purple: 'text-purple-400 bg-purple-900/20',
  };

  return (
    <div className={`p-3 rounded-lg ${colorClasses[color].split(' ')[1]}`}>
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${colorClasses[color].split(' ')[0]}`}>{value}</div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default CacheMetricsDev;
