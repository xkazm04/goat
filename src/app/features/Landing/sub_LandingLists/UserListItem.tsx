import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Play, Clock, Hash, Calendar, AlertTriangle } from "lucide-react";
import { TopList } from "@/types/top-lists";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { listItemVariants, modalBackdropVariants, modalContentVariants } from "../shared/animations";

interface ListItemProps {
  list: TopList;
  onDelete: (listId: string) => void;
  onPlay: (list: TopList) => void;
}

const UserListItem = ({ list, onDelete, onPlay }: ListItemProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(list.id);
      setShowDeleteConfirm(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsDeleting(false);
    }
  };

  const colors = getCategoryColor(list.category);
  const createdDate = new Date(list.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      layout
      variants={listItemVariants}
      className="group relative rounded-xl overflow-hidden"
      style={{
        background: `
          linear-gradient(135deg,
            rgba(20, 28, 48, 0.8) 0%,
            rgba(30, 40, 60, 0.6) 50%,
            rgba(20, 28, 48, 0.8) 100%
          )
        `,
        boxShadow: `
          0 4px 20px rgba(0, 0, 0, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.05)
        `,
      }}
      whileHover={{
        y: -2,
        boxShadow: `
          0 8px 30px rgba(0, 0, 0, 0.35),
          0 0 40px ${colors.primary}10,
          inset 0 1px 0 rgba(255, 255, 255, 0.08)
        `,
      }}
      data-testid={`user-list-item-${list.id}`}
    >
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}05)`,
        }}
      />

      {/* Left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 opacity-70 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})`,
          boxShadow: `0 0 15px ${colors.primary}30`,
        }}
      />

      <div className="relative py-4 px-5 pl-6">
        <div className="flex items-center gap-4">
          {/* Category badge */}
          <motion.div
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              boxShadow: `0 4px 15px ${colors.primary}30`,
            }}
            whileHover={{ scale: 1.05 }}
            data-testid={`user-list-category-${list.id}`}
          >
            {list.category}
          </motion.div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <h4
              className="text-sm font-semibold text-white truncate group-hover:text-white/90 transition-colors"
              data-testid={`user-list-title-${list.id}`}
            >
              {list.title}
            </h4>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
              {list.subcategory && (
                <span className="text-slate-400">{list.subcategory}</span>
              )}
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>Top {list.size}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span className="capitalize">
                  {list.time_period?.replace("-", " ") || "all time"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{createdDate}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Play button */}
            <motion.button
              onClick={() => onPlay(list)}
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

            {/* Delete button */}
            <motion.button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              disabled={isDeleting}
              data-testid={`user-list-delete-btn-${list.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20"
            onClick={() => setShowDeleteConfirm(false)}
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
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                  disabled={isDeleting}
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
    </motion.div>
  );
};

export default UserListItem;