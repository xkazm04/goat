"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Users,
  BarChart3,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsensusData {
  itemId: string;
  hasData: boolean;
  totalRankings?: number;
  averagePosition?: number | null;
  medianPosition?: number | null;
  consensusLevel?: 'unanimous' | 'strong' | 'moderate' | 'mixed' | 'controversial' | null;
  volatility?: number | null;
  confidence?: number | null;
}

interface ItemContextMenuProps {
  itemId: string;
  itemTitle: string;
  x: number;
  y: number;
  onClose: () => void;
  onCopyTitle?: () => void;
}

// Cache for consensus data (5 minute TTL)
const consensusCache = new Map<string, { data: ConsensusData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * ItemContextMenu
 *
 * Right-click context menu showing:
 * - Community consensus stats (avg position, total rankings, consensus level)
 * - Quick actions (copy title, open Wikipedia)
 * - Volatility indicator
 */
export function ItemContextMenu({
  itemId,
  itemTitle,
  x,
  y,
  onClose,
  onCopyTitle,
}: ItemContextMenuProps) {
  const [data, setData] = useState<ConsensusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch consensus data
  useEffect(() => {
    const fetchData = async () => {
      // Check cache first
      const cached = consensusCache.get(itemId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/items/${itemId}/consensus`);
        const result = await response.json();
        setData(result);
        // Cache the result
        consensusCache.set(itemId, { data: result, timestamp: Date.now() });
      } catch (error) {
        console.error('Failed to fetch consensus data:', error);
        setData({ itemId, hasData: false });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [itemId]);

  // Handle copy action
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(itemTitle);
    setCopied(true);
    onCopyTitle?.();
    setTimeout(() => setCopied(false), 1500);
  }, [itemTitle, onCopyTitle]);

  // Close on click outside
  useEffect(() => {
    const handleClick = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Position menu within viewport
  const menuStyle = {
    position: 'fixed' as const,
    left: Math.min(x, window.innerWidth - 260),
    top: Math.min(y, window.innerHeight - 300),
    zIndex: 100,
  };

  const getConsensusColor = (level: string | null | undefined) => {
    switch (level) {
      case 'unanimous': return 'text-emerald-400';
      case 'strong': return 'text-cyan-400';
      case 'moderate': return 'text-blue-400';
      case 'mixed': return 'text-amber-400';
      case 'controversial': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConsensusLabel = (level: string | null | undefined) => {
    switch (level) {
      case 'unanimous': return 'Strong Agreement';
      case 'strong': return 'Good Agreement';
      case 'moderate': return 'Moderate Agreement';
      case 'mixed': return 'Mixed Opinions';
      case 'controversial': return 'Controversial';
      default: return 'No Data';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.15 }}
      style={menuStyle}
      className="w-60 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5">
        <h4 className="text-sm font-medium text-white truncate">{itemTitle}</h4>
      </div>

      {/* Stats Section */}
      <div className="p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
        ) : data?.hasData ? (
          <>
            {/* Primary Stats Row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Average Position */}
              <div className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] text-white/50 uppercase">Avg Rank</span>
                </div>
                <span className="text-lg font-bold text-white">
                  #{data.averagePosition?.toFixed(1) || '—'}
                </span>
              </div>

              {/* Total Rankings */}
              <div className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] text-white/50 uppercase">Rankings</span>
                </div>
                <span className="text-lg font-bold text-white">
                  {data.totalRankings || 0}
                </span>
              </div>
            </div>

            {/* Consensus Level */}
            <div className="p-2 rounded-lg bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-white/70">Consensus</span>
                </div>
                <span className={cn("text-xs font-medium", getConsensusColor(data.consensusLevel))}>
                  {getConsensusLabel(data.consensusLevel)}
                </span>
              </div>
              {/* Volatility bar */}
              {data.volatility !== null && data.volatility !== undefined && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
                    <span>Volatility</span>
                    <span>{(data.volatility * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        data.volatility > 0.7 ? "bg-red-400" :
                        data.volatility > 0.4 ? "bg-amber-400" : "bg-emerald-400"
                      )}
                      style={{ width: `${data.volatility * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-4 text-white/40">
            <AlertTriangle className="w-5 h-5 mb-2" />
            <span className="text-xs">No ranking data yet</span>
            <span className="text-[10px] text-white/30 mt-1">Be the first to rank this item!</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-white/5">
        <button
          onClick={handleCopy}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy title</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default ItemContextMenu;
