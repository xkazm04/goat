"use client";

import { useEffect, useRef } from "react";
import { Trash2, GitCompare } from "lucide-react";

interface SimpleContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onRemove: () => void;
  onToggleCompare: () => void;
  isInCompareList: boolean;
}

/**
 * Minimal context menu for collection items
 */
export function SimpleContextMenu({
  isOpen,
  position,
  onClose,
  onRemove,
  onToggleCompare,
  isInCompareList
}: SimpleContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

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

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[180px]"
      style={{
        top: position.y,
        left: position.x,
      }}
    >
      <button
        onClick={onToggleCompare}
        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <GitCompare className="w-4 h-4" />
        {isInCompareList ? 'Remove from Compare' : 'Add to Compare'}
      </button>
      <button
        onClick={onRemove}
        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Remove Item
      </button>
    </div>
  );
}
