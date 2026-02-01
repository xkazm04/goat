"use client";

import { memo, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import Link from "next/link";
import {
  Grid,
  List,
  Search,
  Plus,
  Folder,
  MoreHorizontal,
  ChevronRight,
  Layers,
  Calendar,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import type { ListCollection, CollectionStats } from "@/types/collection";
import type { TopList } from "@/types/top-lists";

interface CollectionViewProps {
  collection: ListCollection | null;
  lists: TopList[];
  stats?: CollectionStats;
  isLoading?: boolean;
  onAddList?: () => void;
  onRemoveList?: (listId: string) => void;
  onReorderLists?: (listIds: string[]) => void;
}

type ViewMode = "grid" | "list" | "compact";

const ListCard = memo(function ListCard({
  list,
  onRemove,
  showDragHandle,
}: {
  list: TopList;
  onRemove?: () => void;
  showDragHandle?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600/50 hover:bg-slate-800/70 transition-all"
    >
      <Link href={`/match/${list.id}`} className="block p-5">
        <div className="flex items-start gap-3">
          {showDragHandle && (
            <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 text-slate-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2">
              {list.title}
            </h3>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="capitalize">{list.category}</span>
              {list.subcategory && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="capitalize">{list.subcategory}</span>
                </>
              )}
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-slate-700/50 text-xs text-slate-400">
            Top {list.size}
          </span>
        </div>
      </Link>

      {/* Actions */}
      {onRemove && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-red-600/80 text-slate-400 hover:text-white transition-colors"
            title="Remove from collection"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
});

const ListRow = memo(function ListRow({
  list,
  onRemove,
  showDragHandle,
}: {
  list: TopList;
  onRemove?: () => void;
  showDragHandle?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="group"
    >
      <Link
        href={`/match/${list.id}`}
        className="flex items-center gap-4 p-4 bg-slate-800/30 hover:bg-slate-800/60 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-all"
      >
        {showDragHandle && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-slate-500" />
          </div>
        )}
        <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 transition-colors">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate">
            {list.title}
          </h3>
          <p className="text-sm text-slate-500 capitalize">
            {list.category}
            {list.subcategory && ` • ${list.subcategory}`}
          </p>
        </div>
        <span className="text-sm px-3 py-1 rounded-full bg-slate-700/50 text-slate-400">
          Top {list.size}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </Link>
    </motion.div>
  );
});

export const CollectionView = memo(function CollectionView({
  collection,
  lists,
  stats,
  isLoading = false,
  onAddList,
  onRemoveList,
  onReorderLists,
}: CollectionViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderedListIds, setOrderedListIds] = useState<string[]>(
    collection?.listIds || []
  );

  const filteredLists = useMemo(() => {
    if (!searchTerm.trim()) return lists;
    const term = searchTerm.toLowerCase();
    return lists.filter(
      (list) =>
        list.title.toLowerCase().includes(term) ||
        list.category.toLowerCase().includes(term) ||
        list.subcategory?.toLowerCase().includes(term)
    );
  }, [lists, searchTerm]);

  const handleReorder = useCallback(
    (newOrder: string[]) => {
      setOrderedListIds(newOrder);
      onReorderLists?.(newOrder);
    },
    [onReorderLists]
  );

  const orderedLists = useMemo(() => {
    const listMap = new Map(lists.map((l) => [l.id, l]));
    return orderedListIds
      .map((id) => listMap.get(id))
      .filter((l): l is TopList => l !== undefined);
  }, [lists, orderedListIds]);

  // If no collection selected, show all lists
  if (!collection) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">All Lists</h1>
            <p className="text-slate-500 mt-1">
              {lists.length} list{lists.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search lists..."
                className="pl-9 pr-4 py-2 w-64 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <ViewModeToggle mode={viewMode} onModeChange={setViewMode} />
          </div>
        </div>

        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          }
        >
          <AnimatePresence mode="popLayout">
            {filteredLists.map((list) =>
              viewMode === "grid" ? (
                <ListCard key={list.id} list={list} />
              ) : (
                <ListRow key={list.id} list={list} />
              )
            )}
          </AnimatePresence>
        </div>

        {filteredLists.length === 0 && (
          <div className="text-center py-16">
            <Folder className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">
              {searchTerm ? "No lists match your search" : "No lists yet"}
            </p>
          </div>
        )}
      </div>
    );
  }

  const color = collection.color || "#06b6d4";

  return (
    <div className="flex-1 p-6">
      {/* Collection Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
              boxShadow: `0 4px 20px ${color}30`,
            }}
          >
            <Folder className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="text-slate-400 mt-1 line-clamp-2">
                {collection.description}
              </p>
            )}
          </div>
          {collection.shareSlug && collection.isPublic && (
            <Link
              href={`/collections/${collection.shareSlug}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-sm text-slate-400 hover:text-white transition-colors"
              target="_blank"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Share
            </Link>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>{stats.listCount} lists</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Grid className="w-4 h-4" />
              <span>{stats.totalItems} items</span>
            </div>
            {stats.lastActivity && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  Updated {new Date(stats.lastActivity).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in collection..."
            className="pl-9 pr-4 py-2 w-64 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="flex items-center gap-3">
          {onAddList && (
            <button
              onClick={onAddList}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add List
            </button>
          )}
          <ViewModeToggle mode={viewMode} onModeChange={setViewMode} />
        </div>
      </div>

      {/* Lists */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <motion.div
            className="w-10 h-10 border-3 border-cyan-400/30 border-t-cyan-400 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-16">
          <Folder className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">
            {searchTerm
              ? "No lists match your search"
              : "This collection is empty"}
          </p>
          {onAddList && !searchTerm && (
            <button
              onClick={onAddList}
              className="text-cyan-400 hover:text-cyan-300 text-sm"
            >
              Add your first list
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-2"
          }
        >
          <AnimatePresence mode="popLayout">
            {filteredLists.map((list) =>
              viewMode === "grid" ? (
                <ListCard
                  key={list.id}
                  list={list}
                  onRemove={onRemoveList ? () => onRemoveList(list.id) : undefined}
                  showDragHandle={!!onReorderLists}
                />
              ) : (
                <ListRow
                  key={list.id}
                  list={list}
                  onRemove={onRemoveList ? () => onRemoveList(list.id) : undefined}
                  showDragHandle={!!onReorderLists}
                />
              )
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});

function ViewModeToggle({
  mode,
  onModeChange,
}: {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <button
        onClick={() => onModeChange("grid")}
        className={`p-2 rounded-md transition-colors ${
          mode === "grid"
            ? "bg-slate-700 text-white"
            : "text-slate-400 hover:text-white"
        }`}
        title="Grid view"
      >
        <Grid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onModeChange("list")}
        className={`p-2 rounded-md transition-colors ${
          mode === "list"
            ? "bg-slate-700 text-white"
            : "text-slate-400 hover:text-white"
        }`}
        title="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}
