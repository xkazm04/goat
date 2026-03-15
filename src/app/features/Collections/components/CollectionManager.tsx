"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  X,
  Folder,
  FolderPlus,
  Globe,
  Lock,
  Palette,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { ListCollection, CreateCollectionRequest, UpdateCollectionRequest } from "@/types/collection";

interface CollectionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  collection?: ListCollection | null;
  parentCollections?: ListCollection[];
  onSave: (data: CreateCollectionRequest | UpdateCollectionRequest) => Promise<void>;
  onDelete?: (collection: ListCollection) => Promise<void>;
}

const PRESET_COLORS = [
  "#06b6d4", // cyan
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#3b82f6", // blue
  "#ec4899", // pink
  "#84cc16", // lime
];

const PRESET_ICONS = [
  { id: "folder", label: "Folder" },
  { id: "star", label: "Star" },
  { id: "heart", label: "Heart" },
  { id: "bookmark", label: "Bookmark" },
  { id: "flag", label: "Flag" },
  { id: "trophy", label: "Trophy" },
  { id: "zap", label: "Lightning" },
  { id: "music", label: "Music" },
];

export const CollectionManager = memo(function CollectionManager({
  isOpen,
  onClose,
  collection,
  parentCollections = [],
  onSave,
  onDelete,
}: CollectionManagerProps) {
  const reducedMotion = useReducedMotion();
  const isEdit = !!collection;

  const [name, setName] = useState(collection?.name || "");
  const [description, setDescription] = useState(collection?.description || "");
  const [color, setColor] = useState(collection?.color || PRESET_COLORS[0]);
  const [icon, setIcon] = useState(collection?.icon || "folder");
  const [parentId, setParentId] = useState<string | null>(collection?.parentId || null);
  const [isPublic, setIsPublic] = useState(collection?.isPublic || false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const data: CreateCollectionRequest | UpdateCollectionRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
        parentId,
        isPublic,
      };

      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save collection");
    } finally {
      setIsSaving(false);
    }
  }, [name, description, color, icon, parentId, isPublic, onSave, onClose]);

  const handleDelete = useCallback(async () => {
    if (!collection || !onDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(collection);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [collection, onDelete, onClose]);

  // Filter parent options - can't be self or own children
  const availableParents = parentCollections.filter((p) => {
    if (collection && p.id === collection.id) return false;
    if (collection && p.parentId === collection.id) return false;
    if (p.parentId) return false; // Already a child, max 2 levels
    return true;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
          >
            <div className="bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <FolderPlus className="w-5 h-5" style={{ color }} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {isEdit ? "Edit Collection" : "New Collection"}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Error */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Collection"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-brand/50 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:border-brand/50 transition-colors resize-none"
                  />
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Palette className="w-4 h-4 inline-block mr-1.5" />
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-8 h-8 rounded-lg transition-transform ${
                          color === c ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>

                {/* Parent Collection */}
                {availableParents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Folder className="w-4 h-4 inline-block mr-1.5" />
                      Parent Collection
                    </label>
                    <div className="relative">
                      <select
                        value={parentId || ""}
                        onChange={(e) => setParentId(e.target.value || null)}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white appearance-none focus:outline-hidden focus:border-brand/50 transition-colors"
                      >
                        <option value="">No parent (root level)</option>
                        {availableParents.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Visibility Toggle */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Visibility
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                        !isPublic
                          ? "bg-slate-700/50 border-slate-600 text-white"
                          : "bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      Private
                    </button>
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                        isPublic
                          ? "bg-brand-muted/20 border-brand/50 text-brand-hover"
                          : "bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      Public
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {isPublic
                      ? "Anyone with the link can view this collection"
                      : "Only you can see this collection"}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
                {isEdit && onDelete ? (
                  showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-400">Are you sure?</span>
                      <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete collection
                    </button>
                  )
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving || !name.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-muted hover:bg-brand disabled:bg-slate-700 disabled:text-slate-400 text-white text-sm font-medium transition-colors"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEdit ? "Save Changes" : "Create Collection"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
