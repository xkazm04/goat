import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Play, Clock, Hash, Calendar } from 'lucide-react';
import { TopList } from '@/types/top-lists';
import { getCategoryColor } from '@/lib/helpers/getColors';

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
    } catch (error) {
      console.error('Failed to delete list:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const colors = getCategoryColor(list.category);
  const createdDate = new Date(list.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ scale: 1.01 }}
      className="group relative bg-gray-800/40 border border-gray-700/50 rounded-lg overflow-hidden hover:border-cyan-500/30 transition-all duration-300"
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
        }}
      />

      <div className="relative py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Category badge (left) */}
          <div
            className="flex-shrink-0 px-2.5 py-1 rounded text-xs font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
            }}
          >
            {list.category}
          </div>

          {/* Main content (center, flexible) */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
              {list.title}
            </h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              {list.subcategory && (
                <span className="text-gray-400">{list.subcategory}</span>
              )}
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span>Top {list.size}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span className="capitalize">{list.time_period?.replace('-', ' ') || 'all time'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{createdDate}</span>
              </div>
            </div>
          </div>

          {/* Actions (right) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Play Button */}
            <motion.button
              onClick={() => onPlay(list)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Continue</span>
            </motion.button>

            {/* Delete Button */}
            <motion.button
              onClick={() => setShowDeleteConfirm(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 hover:bg-red-500/10 rounded transition-colors text-gray-400 hover:text-red-400"
              disabled={isDeleting}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border-2 border-cyan-500/30 rounded-xl p-4 mx-4 max-w-sm w-full shadow-2xl shadow-cyan-500/20"
            >
              <h4 className="text-base font-semibold text-white mb-2">Delete List?</h4>
              <p className="text-gray-400 mb-4 text-xs">
                "{list.title}" will be permanently deleted. This cannot be undone.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting
                    </span>
                  ) : (
                    'Delete'
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