'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
  /** ID of the element that triggered this menu (for aria-controls) */
  triggerId?: string;
}

export function ContextMenu({
  isOpen,
  position,
  items,
  onClose,
  triggerId
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuId = useRef(`context-menu-${Math.random().toString(36).substr(2, 9)}`).current;

  // Get all enabled item indices
  const getEnabledIndices = useCallback(() => {
    return items.map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled && !item.loading)
      .map(({ index }) => index);
  }, [items]);

  // Find next enabled item index
  const findNextEnabled = useCallback((currentIndex: number, direction: 'up' | 'down'): number => {
    const enabledIndices = getEnabledIndices();
    if (enabledIndices.length === 0) return currentIndex;

    const currentEnabledPos = enabledIndices.indexOf(currentIndex);

    if (direction === 'down') {
      if (currentEnabledPos === -1 || currentEnabledPos === enabledIndices.length - 1) {
        return enabledIndices[0];
      }
      return enabledIndices[currentEnabledPos + 1];
    } else {
      if (currentEnabledPos === -1 || currentEnabledPos === 0) {
        return enabledIndices[enabledIndices.length - 1];
      }
      return enabledIndices[currentEnabledPos - 1];
    }
  }, [getEnabledIndices]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset focus index and focus first item when menu opens
  useEffect(() => {
    if (isOpen) {
      const enabledIndices = getEnabledIndices();
      const firstEnabledIndex = enabledIndices.length > 0 ? enabledIndices[0] : 0;
      setFocusedIndex(firstEnabledIndex);

      // Focus the first enabled item after a brief delay to allow animation
      requestAnimationFrame(() => {
        itemRefs.current[firstEnabledIndex]?.focus();
      });
    }
  }, [isOpen, getEnabledIndices]);

  // Handle keyboard navigation with focus trap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          onClose();
          break;

        case 'ArrowDown':
          event.preventDefault();
          event.stopPropagation();
          const nextIndex = findNextEnabled(focusedIndex, 'down');
          setFocusedIndex(nextIndex);
          itemRefs.current[nextIndex]?.focus();
          break;

        case 'ArrowUp':
          event.preventDefault();
          event.stopPropagation();
          const prevIndex = findNextEnabled(focusedIndex, 'up');
          setFocusedIndex(prevIndex);
          itemRefs.current[prevIndex]?.focus();
          break;

        case 'Home':
          event.preventDefault();
          event.stopPropagation();
          const enabledIndices = getEnabledIndices();
          if (enabledIndices.length > 0) {
            const firstIndex = enabledIndices[0];
            setFocusedIndex(firstIndex);
            itemRefs.current[firstIndex]?.focus();
          }
          break;

        case 'End':
          event.preventDefault();
          event.stopPropagation();
          const allEnabledIndices = getEnabledIndices();
          if (allEnabledIndices.length > 0) {
            const lastIndex = allEnabledIndices[allEnabledIndices.length - 1];
            setFocusedIndex(lastIndex);
            itemRefs.current[lastIndex]?.focus();
          }
          break;

        case 'Tab':
          // Trap focus within the menu - prevent Tab from leaving
          event.preventDefault();
          event.stopPropagation();
          // Tab acts like ArrowDown, Shift+Tab acts like ArrowUp
          if (event.shiftKey) {
            const prevTabIndex = findNextEnabled(focusedIndex, 'up');
            setFocusedIndex(prevTabIndex);
            itemRefs.current[prevTabIndex]?.focus();
          } else {
            const nextTabIndex = findNextEnabled(focusedIndex, 'down');
            setFocusedIndex(nextTabIndex);
            itemRefs.current[nextTabIndex]?.focus();
          }
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          event.stopPropagation();
          const currentItem = items[focusedIndex];
          if (currentItem && !currentItem.disabled && !currentItem.loading) {
            currentItem.onClick();
            onClose();
          }
          break;
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, focusedIndex, findNextEnabled, getEnabledIndices, items]);

  // Adjust position to keep menu within viewport
  const adjustedPosition = React.useMemo(() => {
    if (!isOpen || typeof window === 'undefined') return position;

    const menuWidth = 240;
    const menuHeight = items.length * 44 + 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;

    let x = position.x;
    let y = position.y;

    if (x + menuWidth > viewportWidth - padding) {
      x = viewportWidth - menuWidth - padding;
    }

    if (y + menuHeight > viewportHeight - padding) {
      y = viewportHeight - menuHeight - padding;
    }

    x = Math.max(padding, x);
    y = Math.max(padding, y);

    return { x, y };
  }, [isOpen, position, items.length]);

  if (!mounted) return null;

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/5"
            style={{ zIndex: 999998 }}
            onClick={onClose}
            aria-hidden="true"
            data-testid="context-menu-backdrop"
          />

          {/* Menu */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{
              duration: 0.15,
              ease: 'easeOut'
            }}
            role="menu"
            id={menuId}
            aria-label="Context menu"
            aria-controls={triggerId}
            className="fixed min-w-[240px] backdrop-blur-xl rounded-lg shadow-2xl bg-gray-900/95 border border-gray-700/50 py-2"
            style={{
              left: `${adjustedPosition.x}px`,
              top: `${adjustedPosition.y}px`,
              zIndex: 999999,
            }}
            data-testid="context-menu"
          >
            <div role="none">
              {items.map((item, index) => {
                const Icon = item.icon;
                const isDisabled = item.disabled || item.loading;
                const itemId = `${menuId}-item-${index}`;

                return (
                  <button
                    key={index}
                    ref={(el) => { itemRefs.current[index] = el; }}
                    id={itemId}
                    role="menuitem"
                    tabIndex={focusedIndex === index ? 0 : -1}
                    aria-disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        item.onClick();
                        onClose();
                      }
                    }}
                    onMouseEnter={() => {
                      if (!isDisabled) {
                        setFocusedIndex(index);
                      }
                    }}
                    className={`
                      w-full text-left text-sm flex items-center gap-3 px-4 py-2.5 transition-colors outline-none
                      ${isDisabled
                        ? 'text-gray-500 cursor-not-allowed'
                        : item.destructive
                        ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white focus:bg-gray-700/50 focus:text-white'
                      }
                      ${focusedIndex === index && !isDisabled ? 'ring-1 ring-inset ring-cyan-500/50' : ''}
                    `}
                    data-testid={`context-menu-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {Icon && (
                      <Icon
                        className={`flex-shrink-0 w-4 h-4 ${item.loading ? 'animate-spin' : ''}`}
                        aria-hidden="true"
                      />
                    )}
                    <span>{item.label}</span>
                    {item.loading && (
                      <span className="sr-only">Loading</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(menuContent, document.body)
    : null;
}
