"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Clock,
  Share2,
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { MetadataGrid } from "./MetadataGrid";
import { RankingDistribution, RankingStats } from "./RankingDistribution";

// Inline type for related items (RelatedItemsCarousel was removed)
export interface RelatedItem {
  id: string;
  title: string;
  image_url?: string | null;
  category?: string;
}
import type { ItemDetailResponse } from "@/types/item-details";

export interface ItemInspectorProps {
  /** Item ID to inspect */
  itemId: string | null;
  /** Whether the inspector is open */
  isOpen: boolean;
  /** Called when the inspector should close */
  onClose: () => void;
  /** Called when user wants to add item to grid */
  onQuickAssign?: (itemId: string) => void;
  /** Called when a related item is clicked */
  onRelatedItemClick?: (item: RelatedItem) => void;
}

type ExternalLinkType = 'wikipedia' | 'imdb' | 'spotify' | 'youtube' | 'custom';

const EXTERNAL_LINK_COLORS: Record<ExternalLinkType, string> = {
  wikipedia: 'bg-gray-600 hover:bg-gray-500',
  imdb: 'bg-amber-600 hover:bg-amber-500',
  spotify: 'bg-green-600 hover:bg-green-500',
  youtube: 'bg-red-600 hover:bg-red-500',
  custom: 'bg-blue-600 hover:bg-blue-500',
};

interface RecentRanking {
  listId: string;
  listTitle: string;
  position: number;
  rankedAt: string;
  userId?: string;
}

interface ExternalLinkItem {
  type: ExternalLinkType;
  url: string;
  label: string;
}

/**
 * ItemInspector - Rich item detail panel/modal
 *
 * A comprehensive slide-up panel that displays:
 * - Item image and basic info
 * - Full metadata (year, tags, category, etc.)
 * - Related items carousel
 * - Community ranking distribution
 * - Recent rankings featuring this item
 * - External links
 * - Quick actions
 */
export function ItemInspector({
  itemId,
  isOpen,
  onClose,
  onQuickAssign,
  onRelatedItemClick,
}: ItemInspectorProps) {
  const [data, setData] = useState<ItemDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    metadata: true,
    rankings: true,
    related: true,
    recent: false,
    links: false,
  });

  // Fetch item details when itemId changes
  useEffect(() => {
    if (!itemId || !isOpen) {
      setData(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/items/${itemId}/details`);

        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Item not found' : 'Failed to load item details');
        }

        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error('Error fetching item details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [itemId, isOpen]);

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleQuickAssign = useCallback(() => {
    if (itemId && onQuickAssign) {
      onQuickAssign(itemId);
      onClose();
    }
  }, [itemId, onQuickAssign, onClose]);

  // Desktop backdrop click closes
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={handleBackdropClick}
      >
        {/* Panel - Slide up from bottom on mobile, side panel on desktop */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={cn(
            "absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-hidden",
            "md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[480px] md:max-h-full",
            "bg-gray-900 border-t md:border-l md:border-t-0 border-gray-700 rounded-t-2xl md:rounded-none",
            "flex flex-col"
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspector-title"
        >
          {/* Drag handle (mobile) */}
          <div className="md:hidden flex justify-center py-2">
            <div className="w-10 h-1 rounded-full bg-gray-600" />
          </div>

          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
            <h2 id="inspector-title" className="text-lg font-semibold text-white">
              Item Details
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              aria-label="Close inspector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {loading && (
              <div className="p-4 space-y-4">
                {/* Image skeleton */}
                <div className="w-full aspect-video rounded-lg bg-gray-800/50 animate-pulse" />
                {/* Title skeleton */}
                <div className="h-6 w-3/4 bg-gray-800/50 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-800/50 rounded animate-pulse" />
                {/* Content skeleton */}
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-800/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4">
                  <X className="w-6 h-6 text-rose-400" />
                </div>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            )}

            {data && !loading && (
              <div className="p-4 space-y-6">
                {/* Hero Section */}
                <div className="relative">
                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-gray-800">
                    <PlaceholderImage
                      src={data.item.image_url}
                      alt={data.item.title}
                      seed={data.item.title}
                    />
                  </div>

                  {/* Floating action buttons */}
                  {onQuickAssign && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleQuickAssign}
                      className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-semibold rounded-lg shadow-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Grid
                    </motion.button>
                  )}
                </div>

                {/* Title & Category */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {data.item.title}
                  </h3>
                  {data.item.category && (
                    <p className="text-sm text-gray-400">
                      {data.item.category}
                      {data.item.subcategory && ` / ${data.item.subcategory}`}
                    </p>
                  )}
                </div>

                {/* Collapsible Sections */}
                <div className="space-y-2">
                  {/* Metadata Section */}
                  <CollapsibleSection
                    title="Metadata"
                    isExpanded={expandedSections.metadata}
                    onToggle={() => toggleSection('metadata')}
                  >
                    <MetadataGrid
                      year={data.item.item_year}
                      yearTo={data.item.item_year_to}
                      category={data.item.category}
                      subcategory={data.item.subcategory}
                      tags={data.item.tags}
                      groupName={data.item.group_name}
                      description={data.item.description}
                      createdAt={data.item.created_at}
                    />
                  </CollapsibleSection>

                  {/* Rankings Section */}
                  <CollapsibleSection
                    title="Community Rankings"
                    isExpanded={expandedSections.rankings}
                    onToggle={() => toggleSection('rankings')}
                  >
                    <RankingDistribution stats={data.rankingStats} />
                  </CollapsibleSection>

                  {/* Related Items Section */}
                  <CollapsibleSection
                    title="Related Items"
                    isExpanded={expandedSections.related}
                    onToggle={() => toggleSection('related')}
                    badge={data.relatedItems.length > 0 ? data.relatedItems.length : undefined}
                  >
                    {/* Placeholder - RelatedItemsCarousel was removed */}
                    {data.relatedItems.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {data.relatedItems.map((item: RelatedItem) => (
                          <button
                            key={item.id}
                            onClick={() => onRelatedItemClick?.(item)}
                            className="flex-shrink-0 w-20 text-center hover:bg-gray-800/50 p-2 rounded-lg transition-colors"
                          >
                            <div className="w-16 h-16 mx-auto rounded-lg bg-gray-800 overflow-hidden mb-1">
                              <PlaceholderImage
                                src={item.image_url}
                                alt={item.title}
                                seed={item.title}
                              />
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">{item.title}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No related items</p>
                    )}
                  </CollapsibleSection>

                  {/* Recent Rankings Section */}
                  <CollapsibleSection
                    title="Recent Rankings"
                    isExpanded={expandedSections.recent}
                    onToggle={() => toggleSection('recent')}
                    badge={data.recentRankings.length > 0 ? data.recentRankings.length : undefined}
                  >
                    <RecentRankingsList rankings={data.recentRankings} />
                  </CollapsibleSection>

                  {/* External Links Section */}
                  <CollapsibleSection
                    title="External Links"
                    isExpanded={expandedSections.links}
                    onToggle={() => toggleSection('links')}
                  >
                    <ExternalLinksSection links={data.externalLinks} />
                  </CollapsibleSection>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Collapsible section wrapper
interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isExpanded, onToggle, badge, children }: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">{title}</span>
          {badge !== undefined && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-cyan-500/20 text-cyan-400 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-3 bg-gray-800/10">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Recent rankings list
function RecentRankingsList({ rankings }: { rankings: RecentRanking[] }) {
  if (rankings.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        <Clock className="w-5 h-5 mx-auto mb-2 opacity-50" />
        No recent rankings
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rankings.map((ranking, index) => (
        <motion.div
          key={ranking.listId}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 truncate">{ranking.listTitle}</p>
            <p className="text-[10px] text-gray-500">
              {new Date(ranking.rankedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex-shrink-0 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm font-bold">
            #{ranking.position}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// External links section
function ExternalLinksSection({ links }: { links: ExternalLinkItem[] }) {
  if (links.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        <ExternalLink className="w-5 h-5 mx-auto mb-2 opacity-50" />
        No external links available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link, index) => (
        <motion.a
          key={`${link.type}-${index}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors",
            EXTERNAL_LINK_COLORS[link.type]
          )}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {link.label}
        </motion.a>
      ))}
    </div>
  );
}

export default ItemInspector;
