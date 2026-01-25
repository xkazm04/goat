'use client';

/**
 * QuickActions
 * Contextual action buttons for item cards.
 * Provides fast access to common operations without full navigation.
 */

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Plus,
  Scale,
  Eye,
  Heart,
  Star,
  Trash2,
  Share2,
  MoreHorizontal,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from 'lucide-react';

/**
 * Built-in action types
 */
export type QuickActionType =
  | 'add-to-grid'
  | 'compare'
  | 'preview'
  | 'favorite'
  | 'rate'
  | 'remove'
  | 'share'
  | 'more'
  | 'confirm'
  | 'cancel'
  | 'move-up'
  | 'move-down'
  | 'custom';

/**
 * Quick action configuration
 */
export interface QuickActionConfig {
  /** Unique action identifier */
  id: string;
  /** Action type (determines icon) */
  type: QuickActionType;
  /** Label for tooltip/accessibility */
  label: string;
  /** Custom icon (overrides type icon) */
  icon?: LucideIcon;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Whether action is disabled */
  disabled?: boolean;
  /** Whether action is currently active/toggled */
  active?: boolean;
  /** Custom color */
  color?: string;
  /** Confirmation required before action */
  requiresConfirmation?: boolean;
}

/**
 * Position for quick actions
 */
export type QuickActionsPosition = 'top' | 'bottom' | 'left' | 'right' | 'overlay';

/**
 * Props for QuickActions component
 */
export interface QuickActionsProps {
  /** Action configurations */
  actions: QuickActionConfig[];
  /** Callback when action is triggered */
  onAction: (actionId: string) => void;
  /** Position of actions */
  position?: QuickActionsPosition;
  /** Size of action buttons */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show labels */
  showLabels?: boolean;
  /** Maximum actions to show before "more" */
  maxVisible?: number;
  /** Custom class name */
  className?: string;
}

/**
 * Icon mapping for action types
 */
const ACTION_ICONS: Record<QuickActionType, LucideIcon> = {
  'add-to-grid': Plus,
  compare: Scale,
  preview: Eye,
  favorite: Heart,
  rate: Star,
  remove: Trash2,
  share: Share2,
  more: MoreHorizontal,
  confirm: Check,
  cancel: X,
  'move-up': ArrowUp,
  'move-down': ArrowDown,
  custom: MoreHorizontal,
};

/**
 * Color mapping for action types
 */
const ACTION_COLORS: Record<QuickActionType, string> = {
  'add-to-grid': 'hover:bg-cyan-500/20 hover:text-cyan-400',
  compare: 'hover:bg-purple-500/20 hover:text-purple-400',
  preview: 'hover:bg-blue-500/20 hover:text-blue-400',
  favorite: 'hover:bg-pink-500/20 hover:text-pink-400',
  rate: 'hover:bg-yellow-500/20 hover:text-yellow-400',
  remove: 'hover:bg-red-500/20 hover:text-red-400',
  share: 'hover:bg-green-500/20 hover:text-green-400',
  more: 'hover:bg-gray-500/20 hover:text-gray-300',
  confirm: 'hover:bg-green-500/20 hover:text-green-400',
  cancel: 'hover:bg-red-500/20 hover:text-red-400',
  'move-up': 'hover:bg-blue-500/20 hover:text-blue-400',
  'move-down': 'hover:bg-blue-500/20 hover:text-blue-400',
  custom: 'hover:bg-gray-500/20 hover:text-gray-300',
};

/**
 * Size configurations
 */
const SIZE_CONFIG = {
  sm: {
    button: 'w-7 h-7',
    icon: 'w-3.5 h-3.5',
    gap: 'gap-1',
    padding: 'p-1',
  },
  md: {
    button: 'w-9 h-9',
    icon: 'w-4 h-4',
    gap: 'gap-1.5',
    padding: 'p-1.5',
  },
  lg: {
    button: 'w-11 h-11',
    icon: 'w-5 h-5',
    gap: 'gap-2',
    padding: 'p-2',
  },
};

/**
 * Position configurations
 */
const POSITION_CONFIG: Record<QuickActionsPosition, string> = {
  top: 'absolute top-2 left-1/2 -translate-x-1/2 flex-row',
  bottom: 'absolute bottom-2 left-1/2 -translate-x-1/2 flex-row',
  left: 'absolute left-2 top-1/2 -translate-y-1/2 flex-col',
  right: 'absolute right-2 top-1/2 -translate-y-1/2 flex-col',
  overlay: 'absolute inset-0 flex items-center justify-center',
};

/**
 * Single action button
 */
const ActionButton = memo(function ActionButton({
  action,
  size = 'sm',
  showLabel = false,
  onClick,
}: {
  action: QuickActionConfig;
  size: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick: () => void;
}) {
  const Icon = action.icon || ACTION_ICONS[action.type];
  const sizeConfig = SIZE_CONFIG[size];
  const colorClass = ACTION_COLORS[action.type];

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={action.disabled}
      className={cn(
        'flex items-center justify-center rounded-lg',
        'bg-gray-900/80 backdrop-blur-sm border border-gray-600/50',
        'text-gray-300 transition-colors',
        sizeConfig.button,
        colorClass,
        action.active && 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
        action.disabled && 'opacity-50 cursor-not-allowed'
      )}
      title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
      aria-label={action.label}
      data-testid={`quick-action-${action.id}`}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && (
        <span className="ml-1 text-xs truncate">{action.label}</span>
      )}
    </motion.button>
  );
});

/**
 * QuickActions Component
 *
 * Renders a set of contextual action buttons for item cards.
 * Supports multiple layouts, sizes, and built-in action types.
 *
 * Features:
 * - Built-in icons for common actions
 * - Keyboard shortcut hints
 * - Active/disabled states
 * - Multiple position options
 * - Animated interactions
 */
export const QuickActions = memo(function QuickActions({
  actions,
  onAction,
  position = 'bottom',
  size = 'sm',
  showLabels = false,
  maxVisible = 4,
  className,
}: QuickActionsProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const positionClass = POSITION_CONFIG[position];

  // Split visible and overflow actions
  const visibleActions = actions.slice(0, maxVisible);
  const overflowActions = actions.slice(maxVisible);
  const hasOverflow = overflowActions.length > 0;

  const handleAction = useCallback(
    (actionId: string) => {
      onAction(actionId);
    },
    [onAction]
  );

  if (position === 'overlay') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm',
          'flex items-center justify-center',
          sizeConfig.gap,
          className
        )}
        data-testid="quick-actions-overlay"
      >
        {visibleActions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            size={size}
            showLabel={showLabels}
            onClick={() => handleAction(action.id)}
          />
        ))}
        {hasOverflow && (
          <ActionButton
            action={{
              id: 'more',
              type: 'more',
              label: `${overflowActions.length} more`,
            }}
            size={size}
            onClick={() => handleAction('more')}
          />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: position === 'top' ? -10 : 10 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex z-20',
        positionClass,
        sizeConfig.gap,
        sizeConfig.padding,
        'rounded-lg bg-gray-900/60 backdrop-blur-sm',
        className
      )}
      data-testid="quick-actions"
    >
      {visibleActions.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
        >
          <ActionButton
            action={action}
            size={size}
            showLabel={showLabels}
            onClick={() => handleAction(action.id)}
          />
        </motion.div>
      ))}
      {hasOverflow && (
        <ActionButton
          action={{
            id: 'more',
            type: 'more',
            label: `${overflowActions.length} more`,
          }}
          size={size}
          onClick={() => handleAction('more')}
        />
      )}
    </motion.div>
  );
});

/**
 * Create common quick action configurations
 */
export function createQuickActions(options: {
  onAddToGrid?: () => void;
  onCompare?: () => void;
  onPreview?: () => void;
  onFavorite?: () => void;
  onRemove?: () => void;
  isFavorite?: boolean;
}): QuickActionConfig[] {
  const actions: QuickActionConfig[] = [];

  if (options.onAddToGrid) {
    actions.push({
      id: 'add-to-grid',
      type: 'add-to-grid',
      label: 'Add to Grid',
      shortcut: '1',
    });
  }

  if (options.onCompare) {
    actions.push({
      id: 'compare',
      type: 'compare',
      label: 'Compare',
      shortcut: '2',
    });
  }

  if (options.onPreview) {
    actions.push({
      id: 'preview',
      type: 'preview',
      label: 'Preview',
      shortcut: '3',
    });
  }

  if (options.onFavorite) {
    actions.push({
      id: 'favorite',
      type: 'favorite',
      label: options.isFavorite ? 'Unfavorite' : 'Favorite',
      shortcut: '4',
      active: options.isFavorite,
    });
  }

  if (options.onRemove) {
    actions.push({
      id: 'remove',
      type: 'remove',
      label: 'Remove',
      shortcut: '5',
    });
  }

  return actions;
}

export default QuickActions;
