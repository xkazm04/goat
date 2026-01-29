'use client';

/**
 * MobileFacetDrawer
 * Responsive facet UI for mobile devices - slides up from bottom
 */

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import type {
  Facet,
  FacetSelection,
  HierarchicalFacet,
  FacetActions,
} from '../types';
import { FacetPanel } from './FacetPanel';
import { FacetBreadcrumbs } from './FacetBreadcrumbs';

/**
 * MobileFacetDrawer Props
 */
interface MobileFacetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  facets: Facet[];
  hierarchicalFacets?: HierarchicalFacet[];
  selections: FacetSelection[];
  onToggleValue: FacetActions['toggleFacetValue'];
  onClearFacet: FacetActions['clearFacet'];
  onClearAll: FacetActions['clearAllFacets'];
  onDrillDown?: FacetActions['drillDown'];
  onDrillUp?: FacetActions['drillUp'];
  /** Total count of filtered results */
  resultCount?: number;
  /** Apply button handler (optional - closes drawer by default) */
  onApply?: () => void;
  className?: string;
}

/**
 * MobileFacetDrawer Component
 */
export function MobileFacetDrawer({
  isOpen,
  onClose,
  facets,
  hierarchicalFacets = [],
  selections,
  onToggleValue,
  onClearFacet,
  onClearAll,
  onDrillDown,
  onDrillUp,
  resultCount,
  onApply,
  className,
}: MobileFacetDrawerProps) {
  const dragControls = useDragControls();
  const [facetSearchTerms, setFacetSearchTerms] = useState<Record<string, string>>({});

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleFacetSearchChange = useCallback((facetId: string, term: string) => {
    setFacetSearchTerms((prev) => ({ ...prev, [facetId]: term }));
  }, []);

  const handleApply = useCallback(() => {
    if (onApply) {
      onApply();
    }
    onClose();
  }, [onApply, onClose]);

  // Handle drag to dismiss
  const handleDragEnd = useCallback(
    (_: never, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose]
  );

  // Count active filters
  const activeCount = selections.reduce((sum, s) => sum + s.values.length, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className={cn(
              'fixed inset-x-0 bottom-0 z-50',
              'bg-background rounded-t-2xl shadow-2xl',
              'max-h-[85vh] flex flex-col',
              className
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 400,
            }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            {/* Drag handle */}
            <div
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Filters</h2>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {activeCount}
                  </span>
                )}
              </div>

              <button
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                onClick={onClose}
                aria-label="Close filters"
              >
                <span className="text-lg">×</span>
              </button>
            </div>

            {/* Active filters breadcrumbs */}
            {activeCount > 0 && (
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <FacetBreadcrumbs
                  selections={selections}
                  facets={facets}
                  hierarchicalFacets={hierarchicalFacets}
                  onRemove={onToggleValue}
                  onClearAll={onClearAll}
                  onClearFacet={onClearFacet}
                  compact
                  showClearAll={false}
                />
              </div>
            )}

            {/* Scrollable facet content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <FacetPanel
                facets={facets}
                hierarchicalFacets={hierarchicalFacets}
                selections={selections}
                onToggleValue={onToggleValue}
                onClearFacet={onClearFacet}
                onClearAll={onClearAll}
                onDrillDown={onDrillDown}
                onDrillUp={onDrillUp}
                facetSearchTerms={facetSearchTerms}
                onFacetSearchChange={handleFacetSearchChange}
                compact
                showCounts
                showBars
              />
            </div>

            {/* Footer with actions */}
            <div className="flex items-center gap-3 px-4 py-4 border-t border-border bg-background">
              {/* Clear all */}
              {activeCount > 0 && (
                <button
                  className="flex-1 py-3 rounded-lg border border-border hover:bg-accent transition-colors"
                  onClick={onClearAll}
                >
                  Clear all
                </button>
              )}

              {/* Apply / Show results */}
              <button
                className={cn(
                  'flex-1 py-3 rounded-lg transition-colors',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  activeCount === 0 && 'flex-[2]'
                )}
                onClick={handleApply}
              >
                {resultCount !== undefined
                  ? `Show ${resultCount.toLocaleString()} result${resultCount !== 1 ? 's' : ''}`
                  : 'Apply Filters'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Mobile Filter Button - triggers drawer open
 */
interface MobileFilterButtonProps {
  activeCount: number;
  onClick: () => void;
  className?: string;
}

export function MobileFilterButton({
  activeCount,
  onClick,
  className,
}: MobileFilterButtonProps) {
  return (
    <button
      className={cn(
        'fixed bottom-4 right-4 z-30',
        'flex items-center gap-2 px-4 py-3 rounded-full shadow-lg',
        'bg-primary text-primary-foreground',
        'hover:bg-primary/90 active:scale-95 transition-all',
        'md:hidden', // Only show on mobile
        className
      )}
      onClick={onClick}
    >
      <FilterIcon className="w-5 h-5" />
      <span className="font-medium">Filters</span>
      {activeCount > 0 && (
        <span className="px-2 py-0.5 text-xs bg-primary-foreground text-primary rounded-full">
          {activeCount}
        </span>
      )}
    </button>
  );
}

/**
 * Filter Icon Component
 */
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

/**
 * Hook for managing mobile drawer state
 */
export function useMobileFacetDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

export default MobileFacetDrawer;
