import { motion, AnimatePresence } from "framer-motion";
import { Play, Trash2, AlertTriangle } from "lucide-react";
import { useState, memo, useCallback, useMemo } from "react";

import { ELEVATION, withInset } from "@/components/visual/depth";
import { use3DTilt } from "@/hooks/use-3d-tilt";
import { useIsTouchDevice } from "@/hooks/useMediaQuery";
import { trackError } from "@/lib/errors/error-analytics";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { TopList } from "@/types/top-lists";

import { ListItemContent } from "./ListItemContent";
import { ListPreviewPopover } from "./ListPreviewPopover";
import { ListPreviewThumbnail } from "./ListPreviewThumbnail";
import { RankingProgressIndicator } from "./RankingProgressIndicator";
import { useListProgress } from "./useListProgress";
import { listItemVariants, modalBackdropVariants, modalContentVariants } from "../shared/animations";
import { gradients } from "../shared/gradients";

interface UserListCardProps {
  list: TopList;
  onPlay: (list: TopList) => void;
  onDelete?: (listId: string) => void;
  showPreview?: boolean;
}

export const UserListCard = memo(function UserListCard({
  list,
  onPlay,
  onDelete,
  showPreview = true,
}: UserListCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const colors = useMemo(() => getCategoryColor(list.category), [list.category]);
  const progress = useListProgress(list.id, list.size);

  const isTouchDevice = useIsTouchDevice();
  const { ref, style: tiltStyle, handlers } = use3DTilt({
    maxRotation: 6,
    stiffness: 400,
    damping: 30,
    scale: 1.02,
    disabled: isTouchDevice,
  });

  const createdDate = useMemo(() => {
    if (!list.created_at) return "";
    return new Date(list.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [list.created_at]);

  const handlePlay = useCallback(() => {
    onPlay(list);
  }, [onPlay, list]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(list.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      trackError({
        code: 'CLIENT_UNKNOWN_ERROR',
        category: 'client',
        severity: 'error',
        traceId: `user-list-card-delete-${list.id}-${Date.now()}`,
        source: 'UserListCard',
        context: { operation: 'delete', listId: list.id, message: error instanceof Error ? error.message : String(error) },
      });
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, list.id]);

  const handleShowDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleHideDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return (
    <motion.div
      ref={ref}
      layout
      variants={listItemVariants}
      className="relative group rounded-card overflow-hidden backdrop-blur-md"
      style={{
        ...tiltStyle,
        background: gradients.userCardSurface,
        boxShadow: ELEVATION.medium,
      }}
      {...handlers}
      tabIndex={0}
      data-testid={`user-list-item-${list.id}`}
    >
      {/* Colored accent glow */}
      <motion.div
        className="absolute -inset-px rounded-card opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${colors.primary}15 0%, transparent 70%)`,
        }}
      />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})`,
          boxShadow: `0 0 15px ${colors.primary}30`,
        }}
      />

      <div className="relative py-4 px-5 pl-6">
        <div className="flex items-center gap-4">
          {/* Preview Thumbnail */}
          <div className="shrink-0">
            <ListPreviewThumbnail
              listId={list.id}
              category={list.category}
              size="md"
              imageCount={4}
              enableHover={false}
              testIdPrefix="user-list-thumbnail"
            />
          </div>

          {/* Category badge + progress */}
          <div className="shrink-0 flex flex-col gap-1.5">
            <motion.div
              className="px-3 py-1.5 rounded-control text-xs font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                boxShadow: ELEVATION.medium,
              }}
              whileHover={{ scale: 1.05 }}
              data-testid={`user-list-category-${list.id}`}
            >
              {list.category}
            </motion.div>

            <RankingProgressIndicator
              filled={progress.filled}
              total={progress.total}
              primaryColor={colors.primary}
              secondaryColor={colors.secondary}
              size="sm"
              showText={true}
              testIdPrefix={`user-list-progress-${list.id}`}
            />
          </div>

          {/* Main content - conditionally wrapped with preview popover */}
          {showPreview ? (
            <ListPreviewPopover listId={list.id} side="top" align="start">
              <ListItemContent list={list} createdDate={createdDate} cursorPointer />
            </ListPreviewPopover>
          ) : (
            <ListItemContent list={list} createdDate={createdDate} />
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              onClick={handlePlay}
              className="px-4 py-2 rounded-card text-xs font-medium text-white flex items-center gap-2"
              style={{
                background: gradients.actionPlay,
                boxShadow: ELEVATION.medium,
              }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.98 }}
              data-testid={`user-list-play-btn-${list.id}`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Continue</span>
            </motion.button>

            {onDelete && (
              <motion.button
                onClick={handleShowDeleteConfirm}
                className="p-2 rounded-control text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors
                  focus-ring"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                disabled={isDeleting}
                aria-label={`Delete ${list.title}`}
                data-testid={`user-list-delete-btn-${list.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-20"
            onClick={handleHideDeleteConfirm}
          >
            <motion.div
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="mx-4 max-w-sm w-full p-5 rounded-container"
              style={{
                background: gradients.modalSurface,
                boxShadow: withInset(ELEVATION.modal),
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-card bg-red-500/15">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h4 className="text-lg font-semibold text-white">Delete List?</h4>
              </div>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                <span className="text-white font-medium">"{list.title}"</span> will be
                permanently deleted. This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleHideDeleteConfirm}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white rounded-card hover:bg-white/5 transition-colors
                    focus-ring"
                  disabled={isDeleting}
                  data-testid={`user-list-delete-cancel-btn-${list.id}`}
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-card text-sm font-medium text-white
                    focus-ring"
                  style={{
                    background: gradients.actionDelete,
                    boxShadow: ELEVATION.medium,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid={`user-list-delete-confirm-btn-${list.id}`}
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </span>
                  ) : (
                    "Delete"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
