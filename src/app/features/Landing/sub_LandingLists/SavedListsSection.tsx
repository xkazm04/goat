"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bookmark,
  FolderPlus,
  Clock,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";

import { ELEVATION } from "@/components/visual/depth";
import { useBookmarks, type Bookmark as BookmarkType, type BookmarkFolder } from "@/hooks/use-bookmarks";
import { useListThumbnails } from "@/hooks/use-list-thumbnails";
import { usePlayList } from "@/hooks/use-play-list";
import { useTempUser } from "@/hooks/use-temp-user";
import { DURATION } from "@/lib/animations/motion-presets";
import { hasContent } from "@/lib/async-state";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { TopList } from "@/types/top-lists";

import { SectionHeader } from "./SectionHeader";
import { listContainerVariants, listItemVariants } from "../shared/animations";
import { gradients } from "../shared/gradients";
import { NeonArenaTheme } from "../shared/NeonArenaTheme";

interface SavedListsSectionProps {
  className?: string;
}

/**
 * Compact bookmark card for saved lists
 */
function SavedListCard({
  bookmark,
  imageUrl,
  onPlay,
  onRemove,
}: {
  bookmark: BookmarkType;
  imageUrl: string | null;
  onPlay: (list: TopList) => void;
  onRemove: (listId: string) => void;
}) {
  const list = bookmark.list;

  // Both callbacks are declared ABOVE the absent-list guard. They used to sit
  // below an early `return null`, so a bookmark whose list failed to join
  // changed this component's hook order — react-hooks/rules-of-hooks, held at
  // `warn` and therefore never surfaced.
  const handlePlay = useCallback(() => {
    if (list) onPlay(list as TopList);
  }, [onPlay, list]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(bookmark.list_id);
    },
    [onRemove, bookmark.list_id]
  );

  if (!list) return null;

  const colors = getCategoryColor(list.category);

  return (
    <motion.div
      variants={listItemVariants}
      className="group relative rounded-lg overflow-hidden cursor-pointer"
      style={{
        background: gradients.cardSurface,
        boxShadow: ELEVATION.low,
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={handlePlay}
    >
      {/* Image */}
      <div className="aspect-[3/2] relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `${colors.primary}15` }}
          >
            <span
              className="text-2xl font-bold opacity-20"
              style={{ color: colors.primary }}
            >
              {list.category?.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* Category accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: colors.primary }}
        />

        {/* Remove button on hover */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleRemove}
            className="p-1 rounded-md bg-black/60 text-white/70 hover:text-red-400 hover:bg-black/80 transition-colors"
            aria-label="Remove bookmark"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-medium text-white/90 line-clamp-2 leading-snug">
          {list.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="text-2xs font-medium px-1.5 py-0.5 rounded"
            style={{
              background: `${colors.primary}20`,
              color: colors.primary,
            }}
          >
            {list.category}
          </span>
          <span className="text-2xs text-slate-500">
            Top {list.size}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Folder tab with bookmark count
 */
function FolderTab({
  folder,
  count,
  isActive,
  onClick,
}: {
  folder: BookmarkFolder | { id: string; name: string; icon: string | null; color: string | null };
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
        ${isActive
          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent"
        }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {folder.icon ? (
        <span>{folder.icon}</span>
      ) : (
        <Bookmark className="w-3.5 h-3.5" />
      )}
      <span>{folder.name}</span>
      <span
        className={`text-2xs px-1.5 py-0.5 rounded-full ${
          isActive ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-500"
        }`}
      >
        {count}
      </span>
    </motion.button>
  );
}

/**
 * Create folder mini-form
 */
function CreateFolderForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Folder name..."
        className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 w-36"
        autoFocus
        maxLength={30}
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 disabled:opacity-40 transition-colors"
      >
        Create
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}

export function SavedListsSection({ className }: SavedListsSectionProps) {
  const { tempUserId, isLoaded } = useTempUser();
  const { handlePlayList } = usePlayList();
  const {
    bookmarks,
    folders,
    bookmarksByFolder,
    isLoading,
    // The derived request state, added 2026-08-24. The precedence below used to
    // be reassembled here out of `isLoading` + `error` + `bookmarks.length`; it
    // now switches on one discriminated value that cannot represent the
    // combinations nobody enumerated.
    state: bookmarksState,
    // `error` was returned by useBookmarks all along and never taken here. The
    // result: a failed fetch left `bookmarks` at [], which fell into the
    // "no bookmarks" early return below and DELETED THE WHOLE SECTION —
    // indistinguishable, to the user, from having saved nothing.
    // Failure must be spelled differently from empty success
    // (registry async-ui-states/failure-states).
    error,
    refetch,
    isBookmarked,
    removeBookmark,
    createFolder,
    deleteFolder,
  } = useBookmarks(tempUserId || "");

  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  // Get list IDs for thumbnails
  const listIds = useMemo(
    () => bookmarks.filter(b => b.list).map(b => b.list_id),
    [bookmarks]
  );
  const imageMap = useListThumbnails(listIds);

  const handleRemoveBookmark = useCallback(
    (listId: string) => {
      removeBookmark(listId);
    },
    [removeBookmark]
  );

  const handleCreateFolder = useCallback(
    (name: string) => {
      createFolder({ name });
      setShowCreateFolder(false);
    },
    [createFolder]
  );

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      deleteFolder(folderId);
      if (activeFolder === folderId) setActiveFolder("all");
    },
    [deleteFolder, activeFolder]
  );

  // Filter bookmarks by active folder
  const displayBookmarks = useMemo(() => {
    if (activeFolder === "all") return bookmarks;
    if (activeFolder === "uncategorized") {
      return bookmarks.filter(b => !b.folder_id);
    }
    return bookmarksByFolder[activeFolder] || [];
  }, [activeFolder, bookmarks, bookmarksByFolder]);

  // Precedence is load -> FAIL -> empty -> data, and the failure arm must come
  // before the empty arm or the two collapse into one. `list-grid.tsx` is the
  // one place in this repo that already got this right; this now matches it.
  //
  // The placeholder is shown only when NOTHING is held. Derived from the state
  // rather than from `isLoading`, because `isLoading` is true for a background
  // refresh too, and a refresh must not blank content the user is reading.
  const showPlaceholder = !hasContent(bookmarksState);
  if (!isLoaded || !tempUserId) return null;

  // Nothing held AND nothing wrong: the section genuinely has no reason to
  // exist on the page, so it stays absent. This is the ONLY honest use of the
  // early return.
  if (!isLoading && !error && bookmarks.length === 0) return null;

  // Failed with nothing held: say so, and offer a retry that reissues exactly
  // the request that failed. Deliberately NOT the empty state, and deliberately
  // not silence.
  if (error && bookmarks.length === 0) {
    return (
      <NeonArenaTheme
        variant="minimal"
        as="section"
        className={`py-16 px-6 ${className}`}
        config={{ showLineAccents: true, glowIntensity: 0.06 }}
        data-testid="saved-lists-section"
      >
        <div className="max-w-6xl mx-auto relative">
          <SectionHeader
            icon={Bookmark}
            title="Saved Lists"
            subtitle="Your bookmarked rankings, organized just how you like"
            testIdPrefix="saved-lists"
            gradientColors={{
              start: "rgba(251, 191, 36, 0.12)",
              end: "rgba(245, 158, 11, 0.08)",
            }}
          />
          <div
            className="text-center py-12 bg-gray-800/40 border border-gray-700/50 rounded-lg"
            data-testid="saved-lists-error"
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            {/* States what is known, at the user's altitude — the claim is
                "we could not look", never "you have none". */}
            <p className="text-sm text-slate-300 mb-1">
              Couldn&apos;t load your saved lists
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Your bookmarks are safe — we just couldn&apos;t reach them right now.
            </p>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600
                disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-xs
                transition-colors focus-ring"
              data-testid="saved-lists-retry-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Retrying…" : "Try again"}
            </button>
          </div>
        </div>
      </NeonArenaTheme>
    );
  }

  return (
    <NeonArenaTheme
      variant="minimal"
      as="section"
      className={`py-16 px-6 ${className}`}
      config={{ showLineAccents: true, glowIntensity: 0.06 }}
      data-testid="saved-lists-section"
    >
      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <SectionHeader
          icon={Bookmark}
          title="Saved Lists"
          subtitle="Your bookmarked rankings, organized just how you like"
          testIdPrefix="saved-lists"
          gradientColors={{
            start: "rgba(251, 191, 36, 0.12)",
            end: "rgba(245, 158, 11, 0.08)",
          }}
          rightContent={
            <motion.button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                bg-white/5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Folder</span>
            </motion.button>
          }
        />

        {/* Folder tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <FolderTab
            folder={{ id: "all", name: "All Saved", icon: null, color: null }}
            count={bookmarks.length}
            isActive={activeFolder === "all"}
            onClick={() => setActiveFolder("all")}
          />
          {folders.map((folder) => (
            <FolderTab
              key={folder.id}
              folder={folder}
              count={bookmarksByFolder[folder.id]?.length || 0}
              isActive={activeFolder === folder.id}
              onClick={() => setActiveFolder(folder.id)}
            />
          ))}
          {bookmarksByFolder.uncategorized?.length > 0 && folders.length > 0 && (
            <FolderTab
              folder={{ id: "uncategorized", name: "Unsorted", icon: null, color: null }}
              count={bookmarksByFolder.uncategorized.length}
              isActive={activeFolder === "uncategorized"}
              onClick={() => setActiveFolder("uncategorized")}
            />
          )}

          {/* Create folder inline form */}
          <AnimatePresence>
            {showCreateFolder && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: DURATION.quick }}
              >
                <CreateFolderForm
                  onSubmit={handleCreateFolder}
                  onCancel={() => setShowCreateFolder(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active folder delete button */}
        {activeFolder !== "all" && activeFolder !== "uncategorized" && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {folders.find(f => f.id === activeFolder)?.name}
            </span>
            <button
              onClick={() => handleDeleteFolder(activeFolder)}
              className="text-2xs text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete folder
            </button>
          </div>
        )}

        {/* Loading placeholder — ONLY when nothing is held.
            This used to read `{isLoading ? skeleton : content}`, which blanked
            the whole grid into shimmer every time a background refresh ran over
            bookmarks the user was already looking at: the forbidden
            SETTLED-DATA -> LOADING edge. `showPlaceholder` is false whenever the
            state carries data, so a refresh is now marked (aria-busy on the
            region) instead of erasing it. */}
        {showPlaceholder ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/2] rounded-lg bg-slate-800/30 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <motion.div
            variants={listContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          >
            <AnimatePresence mode="popLayout">
              {displayBookmarks.map((bookmark) => (
                <SavedListCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  imageUrl={imageMap[bookmark.list_id]?.url ?? null}
                  onPlay={handlePlayList}
                  onRemove={handleRemoveBookmark}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Failed refresh while content is held: degrade, never destroy. The
            bookmarks below were true recently and stay rendered; the failure is
            admitted ambiently instead of blanking the region. */}
        {error && bookmarks.length > 0 && (
          <div
            className="flex items-center justify-center gap-2 mb-4 text-xs text-amber-400/80"
            role="status"
            aria-live="polite"
            data-testid="saved-lists-stale-notice"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Couldn&apos;t refresh — showing your last loaded lists.</span>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="underline hover:text-amber-300 disabled:opacity-50 focus-ring rounded"
              data-testid="saved-lists-stale-retry-btn"
            >
              {isLoading ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}

        {/* Empty state for filtered view — gated on `!error` so a dead fetch
            never renders as "this folder is empty". */}
        {!isLoading && !error && displayBookmarks.length === 0 && bookmarks.length > 0 && (
          <div className="text-center py-12">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No lists in this folder yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Drag bookmarks here or save new lists to this folder
            </p>
          </div>
        )}
      </div>
    </NeonArenaTheme>
  );
}
