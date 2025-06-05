"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Eye, EyeOff } from "lucide-react";

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute pointer-events-auto"
            style={{
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div
              className="rounded-xl border overflow-hidden shadow-xl min-w-[180px]"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(15, 23, 42, 0.98) 0%,
                    rgba(30, 41, 59, 0.98) 100%
                  )
                `,
                border: '1px solid rgba(71, 85, 105, 0.4)',
                boxShadow: `
                  0 10px 25px -5px rgba(0, 0, 0, 0.6),
                  0 0 0 1px rgba(148, 163, 184, 0.1)
                `
              }}
            >
              {/* Compare List Option */}
              <button
                onClick={handleToggleCompare}
                className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors hover:bg-slate-700/30 first:rounded-t-xl"
              >
                {isInCompareList ? (
                  <EyeOff className="w-4 h-4 text-red-400" />
                ) : (
                  <Eye className="w-4 h-4 text-green-400" />
                )}
                <span className="text-sm font-medium text-slate-200">
                  {isInCompareList ? 'Remove from compare' : 'Add to compare'}
                </span>
              </button>

              {/* Divider */}
              <div 
                className="h-px"
                style={{ background: 'rgba(71, 85, 105, 0.4)' }}
              />

              {/* Remove Option */}
              <button
                onClick={handleRemove}
                className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors hover:bg-red-500/10 last:rounded-b-xl"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-300">
                  Remove item
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}