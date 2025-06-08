import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Play, Clock, Users, Calendar } from 'lucide-react';
import { TopList } from '@/app/types/top-lists';

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

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'sports':
        return { primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' };
      case 'music':
        return { primary: '#ef4444', secondary: '#dc2626', accent: '#f87171' };
      case 'games':
        return { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' };
      default:
        return { primary: '#6b7280', secondary: '#4b5563', accent: '#9ca3af' };
    }
  };

  const colors = getCategoryColor(list.category);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl"
      style={{
        background: `linear-gradient(135deg, 
          rgba(15, 23, 42, 0.95) 0%,
          rgba(30, 41, 59, 0.98) 50%,
          rgba(15, 23, 42, 0.95) 100%
        )`,
        borderColor: 'rgba(71, 85, 105, 0.3)',
        boxShadow: `0 4px 20px ${colors.primary}15`
      }}
    >
      {/* Background Gradient Effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
        }}
      />

      <div className="relative p-6">
        <div className="flex items-center justify-between">
          {/* Left Section - List Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              {/* Category Badge */}
              <div 
                className="px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                }}
              >
                {list.category.toUpperCase()}
              </div>
              
              {/* Subcategory if exists */}
              {list.subcategory && (
                <div className="px-2 py-1 rounded-md text-xs font-medium text-slate-300 bg-slate-700/50">
                  {list.subcategory}
                </div>
              )}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-slate-100 transition-colors truncate">
              {list.title}
            </h3>

            {/* Metadata Row */}
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>Top {list.size}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className="capitalize">{list.time_period.replace('-', ' ')}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(list.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 ml-4">
            {/* Play Button */}
            <motion.button
              onClick={() => onPlay(list)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-white transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                boxShadow: `0 4px 15px ${colors.primary}30`
              }}
            >
              <Play className="w-4 h-4" />
              <span className="hidden sm:inline">Continue</span>
            </motion.button>

            {/* Delete Button */}
            <motion.button
              onClick={() => setShowDeleteConfirm(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-all duration-300"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-xl p-6 mx-4 max-w-sm w-full border border-slate-700"
            >
              <h4 className="text-lg font-bold text-white mb-2">Delete List?</h4>
              <p className="text-slate-300 mb-4 text-sm">
                This action cannot be undone. "{list.title}" will be permanently deleted.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default UserListItem;