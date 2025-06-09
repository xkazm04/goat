"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Users, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onRemove: () => void;
  onToggleCompare: () => void;
  isInCompareList: boolean;
}

export function ContextMenu({
  isOpen,
  position,
  onClose,
  onRemove,
  onToggleCompare,
  isInCompareList
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleRemove = () => {
    onRemove();
    onClose();
  };

  const handleToggleCompare = () => {
    onToggleCompare();
    onClose();
  };

  const menuItems = [
    {
      label: isInCompareList ? 'Remove from Bench' : 'Add to Bench',
      icon: Users,
      onClick: handleToggleCompare,
      color: isInCompareList ? '#ef4444' : '#3b82f6'
    },
    {
      label: 'Remove Item',
      icon: Trash2,
      onClick: handleRemove,
      color: '#ef4444'
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -10 }}
        className="fixed z-50 min-w-[180px] rounded-xl overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          background: `
            linear-gradient(135deg, 
              rgba(15, 23, 42, 0.95) 0%,
              rgba(30, 41, 59, 0.98) 100%
            )
          `,
          border: '1px solid rgba(71, 85, 105, 0.4)',
          boxShadow: `
            0 20px 25px -5px rgba(0, 0, 0, 0.4),
            0 10px 10px -5px rgba(0, 0, 0, 0.2)
          `,
          backdropFilter: 'blur(8px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-2 border-b border-slate-600/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Actions</span>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-3 h-3 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-1">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-all duration-200 hover:bg-slate-700/30"
            >
              <item.icon 
                className="w-4 h-4" 
                style={{ color: item.color }}
              />
              <span className="text-slate-200 font-medium">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}