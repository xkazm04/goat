"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FolderPlus,
  ChevronDown,
  Check,
  Search,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { memo, useState, useCallback, useRef, useEffect } from "react";

import { useUserCollections } from "@/hooks/use-collections";
import { DURATION } from '@/lib/animations/motion-presets';
import {
  useCollections,
  useCollectionActions,
  useCollectionStore,
} from "@/stores/collection-store";

import type { ListCollection } from "@/types/collection";

interface QuickCollectionSwitcherProps {
  onCreateCollection?: () => void;
  className?: string;
}

export const QuickCollectionSwitcher = memo(function QuickCollectionSwitcher({
  onCreateCollection,
  className = "",
}: QuickCollectionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const collections = useCollections();
  const selectedCollectionId = useCollectionStore(
    (state) => state.selectedCollectionId
  );
  const { setSelectedCollection } = useCollectionActions();

  // Fetch collections if not already loaded
  useUserCollections();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Filter collections by search
  const filteredCollections = searchTerm
    ? collections.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : collections;

  // Get selected collection name
  const selectedCollection = selectedCollectionId
    ? collections.find((c) => c.id === selectedCollectionId)
    : null;

  const handleSelect = useCallback(
    (collection: ListCollection | null) => {
      setSelectedCollection(collection?.id || null);
      setIsOpen(false);
      setSearchTerm("");
    },
    [setSelectedCollection]
  );

  const handleCreate = useCallback(() => {
    setIsOpen(false);
    onCreateCollection?.();
  }, [onCreateCollection]);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-control bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-sm text-slate-300 hover:text-white transition-colors"
      >
        <Folder className="w-4 h-4" />
        <span className="max-w-32 truncate">
          {selectedCollection?.name || "All Lists"}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: DURATION.quick }}
            className="absolute left-0 top-full mt-2 w-64 bg-slate-900 rounded-container border border-slate-700/50 shadow-2xl overflow-hidden z-dropdown"
          >
            {/* Search */}
            <div className="p-2 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search collections..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-control text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-brand/50"
                  autoFocus
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-64 overflow-y-auto py-1">
              {/* All Lists option */}
              <button
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  !selectedCollectionId
                    ? "bg-brand-muted/20 text-brand-hover"
                    : "text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                <div className="w-6 h-6 rounded-control flex items-center justify-center bg-slate-700/50">
                  <Folder className="w-3.5 h-3.5" />
                </div>
                <span className="flex-1">All Lists</span>
                {!selectedCollectionId && <Check className="w-4 h-4" />}
              </button>

              {/* Divider */}
              {filteredCollections.length > 0 && (
                <div className="my-1 h-px bg-slate-800" />
              )}

              {/* Collections */}
              {filteredCollections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => handleSelect(collection)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    selectedCollectionId === collection.id
                      ? "bg-brand-muted/20 text-brand-hover"
                      : "text-slate-300 hover:bg-slate-800/50"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-control flex items-center justify-center"
                    style={{
                      backgroundColor: `${collection.color || "#06b6d4"}20`,
                    }}
                  >
                    <Folder
                      className="w-3.5 h-3.5"
                      style={{ color: collection.color || "#06b6d4" }}
                    />
                  </div>
                  <span className="flex-1 truncate">{collection.name}</span>
                  <span className="text-xs text-slate-500">
                    {collection.listIds.length}
                  </span>
                  {selectedCollectionId === collection.id && (
                    <Check className="w-4 h-4 shrink-0" />
                  )}
                </button>
              ))}

              {/* Empty state */}
              {filteredCollections.length === 0 && searchTerm && (
                <div className="px-3 py-6 text-center text-sm text-slate-500">
                  No collections found
                </div>
              )}

              {/* No collections */}
              {collections.length === 0 && !searchTerm && (
                <div className="px-3 py-6 text-center">
                  <Folder className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No collections yet</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-slate-800">
              {onCreateCollection ? (
                <button
                  onClick={handleCreate}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-control bg-slate-800/50 hover:bg-slate-700/50 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Collection
                </button>
              ) : (
                <Link
                  href="/my-collections"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-control bg-slate-800/50 hover:bg-slate-700/50 text-sm text-slate-400 hover:text-white transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <FolderPlus className="w-4 h-4" />
                  Manage Collections
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
