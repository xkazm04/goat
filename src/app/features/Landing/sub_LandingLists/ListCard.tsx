import { useState, memo, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, ChevronRight, Copy, Trash2, AlertTriangle } from "lucide-react";
import { TopList } from "@/types/top-lists";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { listItemVariants, modalBackdropVariants, modalContentVariants } from "../shared/animations";
import { use3DTilt } from "@/hooks/use-3d-tilt";
import { useIsTouchDevice } from "@/hooks/useMediaQuery";
import { ListPreviewPopover } from "./ListPreviewPopover";
import { ListPreviewThumbnail } from "./ListPreviewThumbnail";
import { ListItemContent } from "./ListItemContent";
import { RankingProgressIndicator } from "./RankingProgressIndicator";
import { useListProgress } from "./useListProgress";

type ListCardVariant = "featured" | "user";

interface ListCardProps {
  list: TopList;
  variant: ListCardVariant;
  onPlay: (list: TopList) => void;
  /** For featured variant: callback when template button clicked */
  onUseAsTemplate?: (list: TopList) => void;
  /** For featured variant: show the template button (default: true) */
  showTemplateButton?: boolean;
  /** For user variant: callback when delete is confirmed */
  onDelete?: (listId: string) => void;
  /** For user variant: enable hover preview popover (default: true) */
  showPreview?: boolean;
}

export const ListCard = memo(function ListCard({
  list,
  variant,
  onPlay,
  onUseAsTemplate,
  showTemplateButton = true,
  onDelete,
  showPreview = true,
}: ListCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const colors = useMemo(() => getCategoryColor(list.category), [list.category]);
  const progress = useListProgress(list.id, list.size);

  // 3D tilt is only used for user variant, disabled on touch devices
  const isTouchDevice = useIsTouchDevice();
  const { ref, style: tiltStyle, handlers } = use3DTilt({
    maxRotation: 6,
    stiffness: 400,
    damping: 30,
    scale: 1.02,
    disabled: variant !== "user" || isTouchDevice,
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

  const handleTemplateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUseAsTemplate?.(list);
  }, [onUseAsTemplate, list]);

  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(list.id);
      setShowDeleteConfirm(false);
    } catch {
      // Error handled by parent
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

  const isFeatured = variant === "featured";
  const isUser = variant === "user";

  // Featured variant: clickable card, smaller padding
  // User variant: larger padding, 3D tilt effect
  const cardContent = (
    <motion.div
      ref={isUser ? ref : undefined}
      layout={isUser}
      variants={isUser ? listItemVariants : undefined}
      className={`relative group rounded-xl overflow-hidden ${isFeatured ? "cursor-pointer" : ""}`}
      whileHover={isFeatured ? { y: -2, scale: 1.005 } : undefined}
      whileTap={isFeatured ? { scale: 0.99 } : undefined}
      onClick={isFeatured ? handlePlay : undefined}
      style={{
        ...(isUser ? tiltStyle : {}),
        // Glassmorphism background
        background: isFeatured
          ? "rgba(15, 23, 42, 0.6)" // Lighter/Glassier for featured
          : "linear-gradient(135deg, rgba(20, 28, 48, 0.9), rgba(30, 40, 60, 0.8))",
        backdropFilter: "blur(12px)",
        boxShadow: isFeatured
          ? "0 8px 32px 0 rgba(0, 0, 0, 0.3)"
          : "0 4px 20px rgba(0, 0, 0, 0.25)",
      }}
      {...(isUser ? handlers : {})}
      tabIndex={isUser ? 0 : undefined}
      data-testid={`${variant}-list-item-${list.id}`}
    >
      {/* Dynamic Gradient Border (Featured) */}
      {isFeatured && (
        <div
          className="absolute inset-0 p-[1px] rounded-xl z-0 opacity-50 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary}, ${colors.primary})`,
            backgroundSize: "200% 200%",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
          }}
        />
      )}

      {/* Colored accent glow */}
      <motion.div
        className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${colors.primary}15 0%, transparent 70%)`,
        }}
      />

      {/* Left accent bar (User variant only) */}
      {!isFeatured && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 opacity-70 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})`,
            boxShadow: `0 0 15px ${colors.primary}30`,
          }}
        />
      )}

      <div className={`relative ${isFeatured ? "p-4 pl-5" : "py-4 px-5 pl-6"}`}>
        <div className={`flex items-center ${isFeatured ? "justify-between gap-3" : "gap-4"}`}>
          {/* Preview Thumbnail - Only for user variant (Featured handles its own internally now) */}
          {!isFeatured && (
            <div className="flex-shrink-0">
              <ListPreviewThumbnail
                listId={list.id}
                category={list.category}
                size="md"
                imageCount={4}
                enableHover={false}
                testIdPrefix={`${variant}-list-thumbnail`}
              />
            </div>
          )}

          {/* Content area - different structure for featured vs user */}
          {isFeatured ? (
            // Featured variant: Expanded horizontal layout
            <div className="flex items-start gap-4 w-full">
              {/* Left side: Thumbnail & Rank */}
              <div className="flex-shrink-0 relative group-hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute -inset-1 bg-gradient-to-br from-cyan-500/30 to-purple-600/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <ListPreviewThumbnail
                  listId={list.id}
                  category={list.category}
                  size="row"
                  imageCount={4}
                  enableHover={false}
                  testIdPrefix={`${variant}-list-thumbnail`}
                />
                <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur border border-white/10 shadow-xl">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    {list.size}
                  </span>
                </div>
              </div>

              {/* Right side: Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className="text-xl font-bold text-white leading-tight group-hover:text-cyan-300 transition-colors line-clamp-2 drop-shadow-md"
                    data-testid={`featured-list-title-${list.id}`}
                  >
                    {list.title}
                  </h4>

                  {/* Category Badge - Interactive Pill */}
                  <motion.button
                    className="flex-shrink-0 px-2.5 py-1 text-[10px] rounded-full uppercase tracking-wider font-bold border backdrop-blur-md transition-all z-10"
                    style={{
                      color: colors.primary,
                      backgroundColor: `${colors.primary}10`,
                      borderColor: `${colors.primary}30`,
                      textShadow: `0 0 10px ${colors.primary}40`
                    }}
                    whileHover={{ scale: 1.1, backgroundColor: `${colors.primary}20` }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Optional: Add category filter handler here if needed
                    }}
                  >
                    {list.category}
                  </motion.button>
                </div>

                <div className="flex items-center gap-3 mt-3 text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    Match Ready
                  </span>
                  <span className="uppercase text-[10px] tracking-wide opacity-80">
                    {list.time_period?.replace("-", " ") || "All time"}
                  </span>
                </div>

                {/* Optional description or stats could go here */}
                {list.description && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-1 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                    {list.description}
                  </p>
                )}

                {/* Progress bar integrated nicely */}
                {progress.hasSession && (
                  <div className="mt-3 w-full max-w-[240px]">
                    <RankingProgressIndicator
                      filled={progress.filled}
                      total={progress.total}
                      primaryColor={colors.primary}
                      secondaryColor={colors.secondary}
                      variant="bar"
                      size="sm"
                      showText={true}
                      testIdPrefix={`featured-list-progress-${list.id}`}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            // User variant: category badge + progress + content with popover
            <>
              <div className="flex-shrink-0 flex flex-col gap-1.5">
                <motion.div
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                    boxShadow: `0 4px 15px ${colors.primary}30`,
                  }}
                  whileHover={{ scale: 1.05 }}
                  data-testid={`user-list-category-${list.id}`}
                >
                  {list.category}
                </motion.div>

                {/* Ranking progress indicator for user */}
                <RankingProgressIndicator
                  filled={progress.filled}
                  total={progress.total}
                  primaryColor={colors.primary}
                  secondaryColor={colors.secondary}
                  variant="bar"
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
            </>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Use as Template button (featured only) */}
            {isFeatured && showTemplateButton && onUseAsTemplate && (
              <motion.button
                className="relative"
                onClick={handleTemplateClick}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                data-testid={`use-template-btn-${list.id}`}
                title="Use as Template"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(34, 211, 238, 0.15))`,
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                  }}
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                </div>
              </motion.button>
            )}

            {/* Play button */}
            {isFeatured ? (
              <motion.div
                className="relative"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}25, ${colors.secondary}20)`,
                    boxShadow: `0 4px 15px ${colors.primary}20`,
                  }}
                >
                  <Play className="w-4 h-4 text-white fill-current" />
                </div>
              </motion.div>
            ) : (
              <motion.button
                onClick={handlePlay}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white flex items-center gap-2"
                style={{
                  background: `linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9))`,
                  boxShadow: `0 4px 15px rgba(59, 130, 246, 0.25)`,
                }}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`user-list-play-btn-${list.id}`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Continue</span>
              </motion.button>
            )}

            {/* Delete button (user only) */}
            {isUser && onDelete && (
              <motion.button
                onClick={handleShowDeleteConfirm}
                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                disabled={isDeleting}
                data-testid={`user-list-delete-btn-${list.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Hover indicator (featured only) */}
        {isFeatured && (
          <motion.div
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all"
            initial={false}
            animate={{ x: 0 }}
            whileHover={{ x: 3 }}
          >
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </motion.div>
        )}
      </div>

      {/* Shimmer effect on hover (featured only) */}
      {isFeatured && (
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background: `
              linear-gradient(
                105deg,
                transparent 40%,
                rgba(255, 255, 255, 0.03) 50%,
                transparent 60%
              )
            `,
            backgroundSize: "200% 100%",
          }}
          animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
        />
      )}

      {/* Delete confirmation modal (user only) */}
      {isUser && (
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              variants={modalBackdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20"
              onClick={handleHideDeleteConfirm}
            >
              <motion.div
                variants={modalContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
                className="mx-4 max-w-sm w-full p-5 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, rgba(15, 20, 35, 0.98), rgba(25, 35, 55, 0.98))`,
                  boxShadow: `
                    0 25px 50px rgba(0, 0, 0, 0.5),
                    0 0 60px rgba(239, 68, 68, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05)
                  `,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-red-500/15">
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
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                    disabled={isDeleting}
                    data-testid={`user-list-delete-cancel-btn-${list.id}`}
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
                    style={{
                      background: `linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(185, 28, 28, 0.9))`,
                      boxShadow: `0 4px 15px rgba(220, 38, 38, 0.25)`,
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
      )}
    </motion.div>
  );

  return cardContent;
});

export default ListCard;
