'use client';

/**
 * LayoutPresetSelector
 * Quick layout switching component
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLayout, useLayoutPreset } from '../LayoutManager';
import { LAYOUT_PRESETS, LAYOUT_ANIMATIONS } from '../constants';
import type { LayoutPreset, LayoutPresetConfig } from '../types';

/**
 * LayoutPresetSelector Props
 */
interface LayoutPresetSelectorProps {
  className?: string;
  /** Display mode */
  mode?: 'dropdown' | 'buttons' | 'cards' | 'compact';
  /** Show preset descriptions */
  showDescriptions?: boolean;
  /** Show icons */
  showIcons?: boolean;
  /** Excluded presets */
  exclude?: LayoutPreset[];
  /** Callback when preset changes */
  onPresetChange?: (preset: LayoutPreset) => void;
}

/**
 * LayoutPresetSelector Component
 */
export function LayoutPresetSelector({
  className,
  mode = 'buttons',
  showDescriptions = true,
  showIcons = true,
  exclude = [],
  onPresetChange,
}: LayoutPresetSelectorProps) {
  const { current, setPreset } = useLayoutPreset();
  const [isOpen, setIsOpen] = useState(false);

  // Get available presets
  const presets = Object.values(LAYOUT_PRESETS).filter(
    (p) => !exclude.includes(p.id)
  );

  const handleSelect = useCallback(
    (preset: LayoutPreset) => {
      setPreset(preset);
      onPresetChange?.(preset);
      setIsOpen(false);
    },
    [setPreset, onPresetChange]
  );

  // Render based on mode
  switch (mode) {
    case 'dropdown':
      return (
        <DropdownSelector
          className={className}
          presets={presets}
          current={current}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          onSelect={handleSelect}
          showIcons={showIcons}
          showDescriptions={showDescriptions}
        />
      );
    case 'cards':
      return (
        <CardSelector
          className={className}
          presets={presets}
          current={current}
          onSelect={handleSelect}
          showIcons={showIcons}
          showDescriptions={showDescriptions}
        />
      );
    case 'compact':
      return (
        <CompactSelector
          className={className}
          presets={presets}
          current={current}
          onSelect={handleSelect}
          showIcons={showIcons}
        />
      );
    default:
      return (
        <ButtonSelector
          className={className}
          presets={presets}
          current={current}
          onSelect={handleSelect}
          showIcons={showIcons}
          showDescriptions={showDescriptions}
        />
      );
  }
}

/**
 * Dropdown Selector
 */
interface SelectorProps {
  className?: string;
  presets: LayoutPresetConfig[];
  current: LayoutPreset;
  onSelect: (preset: LayoutPreset) => void;
  showIcons?: boolean;
  showDescriptions?: boolean;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

function DropdownSelector({
  className,
  presets,
  current,
  isOpen = false,
  setIsOpen,
  onSelect,
  showIcons,
  showDescriptions,
}: SelectorProps) {
  const currentPreset = LAYOUT_PRESETS[current];

  return (
    <div className={cn('relative', className)}>
      {/* Trigger */}
      <button
        className={cn(
          'flex items-center gap-2 px-3 py-2',
          'bg-background border border-border rounded-lg',
          'hover:bg-accent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring'
        )}
        onClick={() => setIsOpen?.(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {showIcons && <span>{currentPreset.icon}</span>}
        <span className="text-sm font-medium">{currentPreset.name}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          ▼
        </motion.span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen?.(false)}
            />

            {/* Menu */}
            <motion.ul
              className={cn(
                'absolute z-20 mt-1 w-64',
                'bg-background border border-border rounded-lg shadow-lg',
                'py-1 overflow-hidden'
              )}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={LAYOUT_ANIMATIONS.transition}
              role="listbox"
              aria-activedescendant={current}
            >
              {presets.map((preset) => (
                <motion.li
                  key={preset.id}
                  className={cn(
                    'px-3 py-2 cursor-pointer',
                    'hover:bg-accent transition-colors',
                    current === preset.id && 'bg-accent'
                  )}
                  onClick={() => onSelect(preset.id)}
                  whileHover={{ x: 4 }}
                  role="option"
                  aria-selected={current === preset.id}
                >
                  <div className="flex items-center gap-2">
                    {showIcons && <span>{preset.icon}</span>}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{preset.name}</div>
                      {showDescriptions && (
                        <div className="text-xs text-muted-foreground">
                          {preset.description}
                        </div>
                      )}
                    </div>
                    {current === preset.id && (
                      <span className="text-primary">✓</span>
                    )}
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Button Selector
 */
function ButtonSelector({
  className,
  presets,
  current,
  onSelect,
  showIcons,
  showDescriptions,
}: SelectorProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group">
      {presets.map((preset) => (
        <motion.button
          key={preset.id}
          className={cn(
            'flex items-center gap-2 px-3 py-2',
            'border rounded-lg transition-colors',
            current === preset.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background border-border hover:bg-accent'
          )}
          onClick={() => onSelect(preset.id)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          title={showDescriptions ? preset.description : undefined}
        >
          {showIcons && <span>{preset.icon}</span>}
          <span className="text-sm font-medium">{preset.name}</span>
        </motion.button>
      ))}
    </div>
  );
}

/**
 * Card Selector
 */
function CardSelector({
  className,
  presets,
  current,
  onSelect,
  showIcons,
  showDescriptions,
}: SelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {presets.map((preset) => (
        <motion.button
          key={preset.id}
          className={cn(
            'flex flex-col items-center gap-2 p-4',
            'border rounded-xl transition-all',
            current === preset.id
              ? 'bg-primary/10 border-primary ring-2 ring-primary'
              : 'bg-background border-border hover:bg-accent hover:border-accent-foreground/20'
          )}
          onClick={() => onSelect(preset.id)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          layout
        >
          {showIcons && (
            <motion.span
              className="text-2xl"
              animate={{ scale: current === preset.id ? 1.2 : 1 }}
            >
              {preset.icon}
            </motion.span>
          )}
          <span className="text-sm font-medium">{preset.name}</span>
          {showDescriptions && (
            <span className="text-xs text-muted-foreground text-center">
              {preset.description}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}

/**
 * Compact Selector (icon-only)
 */
function CompactSelector({
  className,
  presets,
  current,
  onSelect,
  showIcons,
}: SelectorProps) {
  return (
    <div
      className={cn(
        'inline-flex bg-muted rounded-lg p-1',
        className
      )}
      role="group"
    >
      {presets.map((preset) => (
        <motion.button
          key={preset.id}
          className={cn(
            'relative px-3 py-1.5 rounded-md transition-colors',
            current === preset.id
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onSelect(preset.id)}
          title={preset.name}
        >
          {current === preset.id && (
            <motion.div
              className="absolute inset-0 bg-primary rounded-md"
              layoutId="preset-indicator"
              transition={LAYOUT_ANIMATIONS.transition}
            />
          )}
          <span className="relative z-10">
            {showIcons ? preset.icon : preset.name.charAt(0)}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

/**
 * Preset Preview Component
 */
interface PresetPreviewProps {
  preset: LayoutPreset;
  className?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function PresetPreview({
  preset,
  className,
  isActive,
  onClick,
}: PresetPreviewProps) {
  const config = LAYOUT_PRESETS[preset];

  // Create mini layout preview
  const renderMiniLayout = () => {
    const showSidebar = config.sidebarState !== 'hidden';
    const sidebarLeft = config.sidebarPosition === 'left';
    const sidebarRight = config.sidebarPosition === 'right';
    const sidebarBottom = config.sidebarPosition === 'bottom';

    return (
      <div className="w-full h-12 bg-muted/50 rounded border border-border/50 overflow-hidden flex flex-col">
        {/* Header */}
        {config.showHeader && (
          <div className="h-1.5 bg-border/50 flex-shrink-0" />
        )}

        {/* Content */}
        <div className="flex-1 flex">
          {/* Left sidebar */}
          {showSidebar && sidebarLeft && (
            <div
              className="bg-accent/30 border-r border-border/30"
              style={{ width: '20%' }}
            />
          )}

          {/* Main */}
          <div className="flex-1 p-1">
            <div
              className="w-full h-full grid gap-0.5"
              style={{
                gridTemplateColumns: `repeat(${config.gridColumns}, 1fr)`,
              }}
            >
              {Array.from({ length: config.gridColumns * 2 }).map((_, i) => (
                <div key={i} className="bg-primary/20 rounded-sm" />
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          {showSidebar && sidebarRight && (
            <div
              className="bg-accent/30 border-l border-border/30"
              style={{ width: '20%' }}
            />
          )}
        </div>

        {/* Bottom sidebar */}
        {showSidebar && sidebarBottom && (
          <div className="h-2 bg-accent/30 border-t border-border/30" />
        )}

        {/* Footer */}
        {config.showFooter && (
          <div className="h-1 bg-border/50 flex-shrink-0" />
        )}
      </div>
    );
  };

  return (
    <motion.button
      className={cn(
        'flex flex-col gap-2 p-3 rounded-lg border transition-all',
        isActive
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-border/80 hover:bg-accent/50',
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Mini layout preview */}
      {renderMiniLayout()}

      {/* Label */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{config.icon}</span>
        <span className="text-xs font-medium">{config.name}</span>
      </div>
    </motion.button>
  );
}

/**
 * Quick Layout Switcher (floating button)
 */
interface QuickLayoutSwitcherProps {
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export function QuickLayoutSwitcher({
  className,
  position = 'bottom-right',
}: QuickLayoutSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { current, setPreset } = useLayoutPreset();

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div className={cn('fixed z-50', positionClasses[position], className)}>
      {/* Trigger */}
      <motion.button
        className={cn(
          'w-12 h-12 rounded-full',
          'bg-primary text-primary-foreground',
          'shadow-lg hover:shadow-xl',
          'flex items-center justify-center',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
        )}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Change layout"
      >
        <span className="text-lg">{LAYOUT_PRESETS[current].icon}</span>
      </motion.button>

      {/* Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn(
              'absolute w-48 p-2',
              'bg-background border border-border rounded-lg shadow-xl',
              position.includes('bottom') ? 'bottom-14' : 'top-14',
              position.includes('right') ? 'right-0' : 'left-0'
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={LAYOUT_ANIMATIONS.transition}
          >
            {Object.values(LAYOUT_PRESETS).map((preset) => (
              <motion.button
                key={preset.id}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md',
                  'hover:bg-accent transition-colors',
                  current === preset.id && 'bg-accent'
                )}
                onClick={() => {
                  setPreset(preset.id);
                  setIsOpen(false);
                }}
                whileHover={{ x: 4 }}
              >
                <span>{preset.icon}</span>
                <span className="text-sm">{preset.name}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
