"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Star,
  Clock,
  CheckCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Globe,
  Lock,
} from "lucide-react";
import { memo, useCallback, useState } from "react";

import { DURATION } from '@/lib/animations/motion-presets';
import {
  useCollectionTree,
  useCollectionActions,
} from "@/stores/collection-store";
import { DEFAULT_COLLECTIONS } from "@/types/collection";

import type { ListCollection, CollectionTreeNode } from "@/types/collection";

interface CollectionSidebarProps {
  onSelectCollection: (collection: ListCollection | null) => void;
  selectedCollectionId: string | null;
  onCreateCollection?: () => void;
  onEditCollection?: (collection: ListCollection) => void;
  onDeleteCollection?: (collection: ListCollection) => void;
}

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  star: Star,
  clock: Clock,
  "check-circle": CheckCircle,
};

function getIconComponent(icon: string | null) {
  if (!icon) return Folder;
  return ICONS[icon] || Folder;
}

interface TreeNodeProps {
  node: CollectionTreeNode;
  selectedId: string | null;
  onSelect: (collection: ListCollection) => void;
  onToggle: (id: string) => void;
  onEdit?: (collection: ListCollection) => void;
  onDelete?: (collection: ListCollection) => void;
}

const TreeNode = memo(function TreeNode({
  node,
  selectedId,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
}: TreeNodeProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { collection, children, isExpanded, depth } = node;
  const hasChildren = children.length > 0;
  const isSelected = selectedId === collection.id;
  const color = collection.color || "#06b6d4";
  const IconComponent = getIconComponent(collection.icon);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle(collection.id);
    },
    [collection.id, onToggle]
  );

  const handleSelect = useCallback(() => {
    onSelect(collection);
  }, [collection, onSelect]);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(false);
      onEdit?.(collection);
    },
    [collection, onEdit]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowMenu(false);
      onDelete?.(collection);
    },
    [collection, onDelete]
  );

  return (
    <div>
      <motion.div
        className={`group relative flex items-center gap-2 px-3 py-2 rounded-card cursor-pointer transition-colors ${
          isSelected
            ? "bg-slate-700/60 text-white"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={handleSelect}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-slate-700/50 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Folder icon */}
        <div
          className="w-6 h-6 rounded-control flex items-center justify-center shrink-0"
          style={{
            backgroundColor: isSelected ? `${color}30` : `${color}15`,
          }}
        >
          <IconComponent
            className="w-3.5 h-3.5"
            style={{ color: isSelected ? color : undefined }}
          />
        </div>

        {/* Name */}
        <span className="flex-1 text-sm font-medium truncate">
          {collection.name}
        </span>

        {/* List count */}
        <span className="text-xs text-slate-500 tabular-nums">
          {collection.listIds.length}
        </span>

        {/* Visibility indicator */}
        {collection.isPublic ? (
          <Globe className="w-3 h-3 text-slate-600" />
        ) : (
          <Lock className="w-3 h-3 text-slate-600" />
        )}

        {/* Actions menu */}
        {(onEdit || onDelete) && (
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded hover:bg-slate-700/50"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 py-1 w-28 bg-slate-800 rounded-card border border-slate-700 shadow-xl z-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onEdit && (
                    <button
                      onClick={handleEdit}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700/50"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-red-400 hover:bg-slate-700/50"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.quick }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <TreeNode
                key={child.collection.id}
                node={child}
                selectedId={selectedId}
                onSelect={onSelect}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const CollectionSidebar = memo(function CollectionSidebar({
  onSelectCollection,
  selectedCollectionId,
  onCreateCollection,
  onEditCollection,
  onDeleteCollection,
}: CollectionSidebarProps) {
  const tree = useCollectionTree();
  const { toggleCollectionExpanded } = useCollectionActions();

  const handleSelect = useCallback(
    (collection: ListCollection) => {
      onSelectCollection(collection);
    },
    [onSelectCollection]
  );

  const handleShowAll = useCallback(() => {
    onSelectCollection(null);
  }, [onSelectCollection]);

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border-r border-slate-800/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 divider-gradient">
        <h2 className="text-sm font-semibold text-white">Collections</h2>
        {onCreateCollection && (
          <button
            onClick={onCreateCollection}
            className="p-1.5 rounded-control bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            title="Create collection"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* All Lists option */}
      <div className="px-2 pt-3">
        <motion.button
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-card text-sm font-medium transition-colors ${
            selectedCollectionId === null
              ? "bg-brand-muted/20 text-brand-hover"
              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
          }`}
          onClick={handleShowAll}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-6 h-6 rounded-control flex items-center justify-center bg-slate-700/50">
            <Folder className="w-3.5 h-3.5" />
          </div>
          All Lists
        </motion.button>
      </div>

      {/* Divider */}
      <div className="mx-4 my-3 h-px bg-slate-800/50" />

      {/* Collection tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {tree.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Folder className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-3">No collections yet</p>
            {onCreateCollection && (
              <button
                onClick={onCreateCollection}
                className="text-sm text-brand-hover hover:text-brand-hover transition-colors"
              >
                Create your first collection
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {tree.map((node) => (
              <TreeNode
                key={node.collection.id}
                node={node}
                selectedId={selectedCollectionId}
                onSelect={handleSelect}
                onToggle={toggleCollectionExpanded}
                onEdit={onEditCollection}
                onDelete={onDeleteCollection}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="border-t border-slate-800/50 p-3">
        <div className="text-xs text-slate-600 uppercase tracking-wider mb-2 px-2">
          Quick Access
        </div>
        {DEFAULT_COLLECTIONS.map((config) => {
          const IconComponent = ICONS[config.icon] || Folder;
          return (
            <button
              key={config.type}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-control text-sm text-slate-500 hover:bg-slate-800/30 hover:text-slate-300 transition-colors"
            >
              <IconComponent className="w-3.5 h-3.5" style={{ color: config.color }} />
              {config.name}
            </button>
          );
        })}
      </div>
    </div>
  );
});
