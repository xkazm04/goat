'use client';

/**
 * ListSettingsModal
 * Modal for editing list settings including criteria configuration after list creation
 */

import { useCallback } from 'react';
import { Settings, Star, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GlassModal,
  GlassModalHeader,
  GlassModalBody,
  GlassModalFooter,
  GLASS_BUTTON_PRIMARY,
} from '@/components/ui/glass-modal';
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

  const handleClose = useCallback(() => {
    if (syncStatus !== 'syncing') {
      onClose();
    }
  }, [syncStatus, onClose]);

  return (
    <GlassModal open={isOpen} onClose={handleClose} size="sm:w-[560px]">
      <GlassModalHeader
        icon={Settings}
        title="List Settings"
        subtitle={listTitle}
        onClose={handleClose}
      />

      <GlassModalBody className="space-y-6">
        {/* Rating Criteria Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-400" />
            <label className="text-sm font-medium text-white">
              Rating Criteria
            </label>
          </div>
          <p className="text-xs text-gray-400 mb-4">
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
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-900/40 transition-all duration-200 hover:bg-gray-900/50">
          <span className="text-xs text-gray-400">Sync Status</span>
          <div className="flex items-center gap-2">
            {syncStatus === 'idle' && (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-400">Saved</span>
              </>
            )}
            {syncStatus === 'syncing' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-brand-hover animate-spin" />
                <span className="text-xs text-brand-hover">Saving...</span>
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
      </GlassModalBody>

      <GlassModalFooter>
        <div className="flex items-center justify-end">
          <button
            onClick={handleClose}
            disabled={syncStatus === 'syncing'}
            className={cn(
              GLASS_BUTTON_PRIMARY,
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            Done
          </button>
        </div>
      </GlassModalFooter>
    </GlassModal>
  );
}

export default ListSettingsModal;
