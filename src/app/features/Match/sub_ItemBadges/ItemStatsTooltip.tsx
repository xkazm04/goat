"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsensusData {
  hasData: boolean;
  totalRankings?: number;
  averagePosition?: number | null;
  consensusLevel?: 'unanimous' | 'strong' | 'moderate' | 'mixed' | 'controversial' | null;
}

interface ItemStatsTooltipProps {
  itemId: string;
  children: React.ReactNode;
  disabled?: boolean;
}

// Shared cache with context menu
const tooltipCache = new Map<string, { data: ConsensusData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const HOVER_DELAY = 500; // ms before showing tooltip

/**
 * ItemStatsTooltip
 *
 * Lightweight hover tooltip showing quick stats preview:
 * "Avg #3 • 45 rankings • Strong"
 *
 * Delays 500ms before showing to avoid flickering.
 * Uses same cache as ItemContextMenu.
 */
export function ItemStatsTooltip({
  itemId,
  children,
  disabled = false,
}: ItemStatsTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<ConsensusData | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (disabled) return;

    // Calculate position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });

    // Delay before showing
    timeoutRef.current = setTimeout(async () => {
      // Check cache
      const cached = tooltipCache.get(itemId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        setIsVisible(true);
        return;
      }

      try {
        const response = await fetch(`/api/items/${itemId}/consensus`);
        const result = await response.json();
        tooltipCache.set(itemId, { data: result, timestamp: Date.now() });
        setData(result);
        setIsVisible(true);
      } catch {
        setData({ hasData: false });
        setIsVisible(true);
      }
    }, HOVER_DELAY);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const getConsensusEmoji = (level: string | null | undefined) => {
    switch (level) {
      case 'unanimous': return '🏆';
      case 'strong': return '✨';
      case 'moderate': return '👍';
      case 'mixed': return '🤔';
      case 'controversial': return '🔥';
      default: return '';
    }
  };

  const getConsensusLabel = (level: string | null | undefined) => {
    switch (level) {
      case 'unanimous': return 'Unanimous';
      case 'strong': return 'Strong';
      case 'moderate': return 'Moderate';
      case 'mixed': return 'Mixed';
      case 'controversial': return 'Controversial';
      default: return '';
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}

      <AnimatePresence>
        {isVisible && data && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[100] pointer-events-none"
            style={{
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="px-2.5 py-1.5 rounded-lg bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30 whitespace-nowrap">
              {data.hasData ? (
                <div className="flex items-center gap-2 text-xs">
                  {/* Avg Position */}
                  <span className="flex items-center gap-1 text-cyan-400">
                    <TrendingUp className="w-3 h-3" />
                    #{data.averagePosition?.toFixed(1)}
                  </span>

                  <span className="text-white/20">•</span>

                  {/* Total Rankings */}
                  <span className="flex items-center gap-1 text-white/60">
                    <Users className="w-3 h-3" />
                    {data.totalRankings}
                  </span>

                  {/* Consensus Level */}
                  {data.consensusLevel && (
                    <>
                      <span className="text-white/20">•</span>
                      <span className="flex items-center gap-1">
                        <span>{getConsensusEmoji(data.consensusLevel)}</span>
                        <span className="text-white/50">{getConsensusLabel(data.consensusLevel)}</span>
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-xs text-white/40 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  No rankings yet
                </span>
              )}
            </div>

            {/* Arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-900/95 border-r border-b border-white/10"
              style={{ bottom: -4 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ItemStatsTooltip;
