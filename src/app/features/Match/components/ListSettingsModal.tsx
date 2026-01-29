'use client';

/**
 * ListSettingsModal
 * Modal for editing list settings including criteria configuration after list creation
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Star, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCriteriaStore, useSyncStatus } from '@/stores/criteria-store';
import { CriteriaProfileSelector } from './CriteriaProfileSelector';
import type { CriteriaProfile } from '@/lib/criteria/types';

interface ListSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listCategory?: string;
  listTitle?: string;
}

export function ListSettingsModal({
  isOpen,
  onClose,
  listId,
  listCategory,
  listTitle,
}: ListSettingsModalProps) {
  const { setActiveProfile, saveToDatabase } = useCriteriaStore();
  const { status: syncStatus } = useSyncStatus();

  // Handle profile selection - sets active and saves to DB
  const handleProfileSelect = useCallback(
    async (profile: CriteriaProfile) => {
      setActiveProfile(profile.id);
      await saveToDatabase(listId);
    },
    [setActiveProfile, saveToDatabase, listId]
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(() => {
    if (syncStatus !== 'syncing') {
      onClose();
    }
  }, [syncStatus, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: `
                  linear-gradient(135deg,
                    rgba(15, 20, 35, 0.98) 0%,
                    rgba(25, 35, 55, 0.98) 50%,
                    rgba(15, 20, 35, 0.98) 100%
                  )
                `,
                boxShadow: `
                  0 25px 60px rgba(0, 0, 0, 0.5),
                  0 0 80px rgba(6, 182, 212, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800/50">
                    <Settings className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      List Settings
                    </h2>
                    {listTitle && (
                      <p className="text-sm text-slate-400 truncate max-w-[280px]">
                        {listTitle}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={syncStatus === 'syncing'}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'hover:bg-slate-700/50 text-slate-400 hover:text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label="Close settings"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Rating Criteria Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-amber-400" />
                    <label className="text-sm font-medium text-white">
                      Rating Criteria
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Choose how you want to evaluate and score items in this list.
                    Criteria help you make consistent, thoughtful rankings.
                  </p>
                  <CriteriaProfileSelector
                    category={listCategory}
                    onProfileSelect={handleProfileSelect}
                    showActions={true}
                    className="w-full"
                  />
                </div>

                {/* Sync Status Indicator */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/30">
                  <span className="text-xs text-slate-400">Sync Status</span>
                  <div className="flex items-center gap-2">
                    {syncStatus === 'idle' && (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-xs text-green-400">Saved</span>
                      </>
                    )}
                    {syncStatus === 'syncing' && (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                        <span className="text-xs text-cyan-400">Saving...</span>
                      </>
                    )}
                    {syncStatus === 'error' && (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs text-red-400">Error saving</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700/50">
                <button
                  onClick={onClose}
                  disabled={syncStatus === 'syncing'}
                  className={cn(
                    'px-6 py-2.5 rounded-xl font-medium transition-all duration-200',
                    'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
                    'hover:bg-cyan-500/30 hover:border-cyan-500/50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ListSettingsModal;
