'use client';

import React, { useEffect, useRef, useState } from 'react';
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
}

export function ContextMenu({
  isOpen,
  position,
  items,
  onClose
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

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
            className="fixed min-w-[240px] backdrop-blur-xl rounded-lg shadow-2xl bg-gray-900/95 border border-gray-700/50 py-2"
            style={{
              left: `${adjustedPosition.x}px`,
              top: `${adjustedPosition.y}px`,
              zIndex: 999999,
            }}
          >
            <div>
              {items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (!item.disabled && !item.loading) {
                        item.onClick();
                        onClose();
                      }
                    }}
                    disabled={item.disabled || item.loading}
                    className={`
                      w-full text-left text-sm flex items-center gap-3 px-4 py-2.5 transition-colors
                      ${item.disabled || item.loading
                        ? 'text-gray-500 cursor-not-allowed'
                        : item.destructive
                        ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                      }
                    `}
                  >
                    {Icon && (
                      <Icon className={`flex-shrink-0 w-4 h-4 ${item.loading ? 'animate-spin' : ''}`} />
                    )}
                    <span>{item.label}</span>
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
