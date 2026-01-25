'use client';

/**
 * ExpandedPreview
 * Hover/tap detail view for item cards.
 * Shows full item information with actions and metadata.
 */

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { QuickActions, QuickActionConfig } from './QuickActions';
import { MetadataBadges, MetadataBadgeData } from './MetadataBadges';
import { RichItemData } from './RichItemCard';

/**
 * Props for ExpandedPreview component
 */
export interface ExpandedPreviewProps {
  /** Item data */
  item: RichItemData;
  /** Metadata badges */
  badges?: MetadataBadgeData[];
  /** Quick actions */
  quickActions?: QuickActionConfig[];
  /** Close handler */
  onClose: () => void;
  /** Quick action handler */
  onQuickAction?: (actionId: string) => void;
  /** Custom content renderer */
  renderContent?: (item: RichItemData) => React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * ExpandedPreview Component
 *
 * An overlay that shows detailed item information.
 * Appears on hover or tap and provides full context.
 *
 * Features:
 * - Full item description
 * - All metadata badges
 * - Quick action buttons
 * - Image gallery navigation
 * - Keyboard dismissal
 * - Click outside to close
 */
export const ExpandedPreview = memo(function ExpandedPreview({
  item,
  badges = [],
  quickActions = [],
  onClose,
  onQuickAction,
  renderContent,
  className,
}: ExpandedPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleQuickAction = useCallback(
    (actionId: string) => {
      onQuickAction?.(actionId);
    },
    [onQuickAction]
  );

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'absolute inset-0 z-30',
        'bg-gray-900/95 backdrop-blur-md',
        'rounded-lg overflow-hidden',
        'flex flex-col',
        className
      )}
      onClick={handleBackdropClick}
      data-testid="expanded-preview"
    >
      {/* Close button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onClick={onClose}
        className="absolute top-2 right-2 z-40 p-1.5 rounded-lg bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        aria-label="Close preview"
      >
        <X className="w-4 h-4" />
      </motion.button>

      {/* Image header */}
      {item.image && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative h-24 bg-gray-800 overflow-hidden flex-shrink-0"
        >
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900" />
        </motion.div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Title and badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-semibold text-white text-sm leading-tight">
            {item.title}
          </h3>
          {item.subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{item.subtitle}</p>
          )}
        </motion.div>

        {/* Badges */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap gap-1"
          >
            <MetadataBadges
              badges={badges}
              position="top-left"
              size="xs"
              maxVisible={6}
              className="relative static"
            />
          </motion.div>
        )}

        {/* Description */}
        {item.description && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">
              {item.description}
            </p>
          </motion.div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-wrap gap-1"
          >
            {item.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] bg-gray-700/50 text-gray-400 rounded"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 5 && (
              <span className="px-1.5 py-0.5 text-[10px] text-gray-500">
                +{item.tags.length - 5}
              </span>
            )}
          </motion.div>
        )}

        {/* Custom content */}
        {renderContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {renderContent(item)}
          </motion.div>
        )}
      </div>

      {/* Quick actions footer */}
      {quickActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex-shrink-0 p-3 border-t border-gray-700/50 bg-gray-800/50"
        >
          <QuickActions
            actions={quickActions}
            onAction={handleQuickAction}
            position="bottom"
            size="md"
            showLabels={true}
            className="relative static flex justify-center bg-transparent p-0"
          />
        </motion.div>
      )}
    </motion.div>
  );
});

/**
 * Tooltip preview - simpler version for hover tooltips
 */
export const TooltipPreview = memo(function TooltipPreview({
  item,
  badges = [],
  className,
}: {
  item: RichItemData;
  badges?: MetadataBadgeData[];
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 5, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'bg-gray-900 border border-gray-700 rounded-lg shadow-xl',
        'p-3 min-w-[200px] max-w-[280px]',
        className
      )}
    >
      <h4 className="font-medium text-white text-sm">{item.title}</h4>
      {item.subtitle && (
        <p className="text-xs text-gray-400 mt-0.5">{item.subtitle}</p>
      )}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {badges.slice(0, 3).map((badge) => (
            <span
              key={`${badge.type}-${badge.value}`}
              className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-300 rounded"
            >
              {String(badge.value)}
            </span>
          ))}
        </div>
      )}
      {item.description && (
        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
          {item.description}
        </p>
      )}
    </motion.div>
  );
});

export default ExpandedPreview;
