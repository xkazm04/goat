'use client';

/**
 * CreateChallengeModal Component
 * Modal for creating a new challenge
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChallengeStore } from '@/stores/challenge-store';
import {
  CHALLENGE_TEMPLATES,
  type ChallengeType,
  type ChallengeConfig,
} from '@/lib/challenges/types';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    listId: string;
    config: Partial<ChallengeConfig>;
  }) => Promise<void>;
  listId: string;
  listTitle: string;
}

const CHALLENGE_TYPES: { value: ChallengeType; label: string; description: string }[] = [
  {
    value: 'beat_my_ranking',
    label: 'Beat My Ranking',
    description: 'Share your ranking and challenge others to match it',
  },
  {
    value: 'collaborative',
    label: 'Collaborative',
    description: 'Work together to create a group consensus ranking',
  },
  {
    value: 'speed_ranking',
    label: 'Speed Ranking',
    description: 'Race against the clock to complete the ranking',
  },
  {
    value: 'blind_ranking',
    label: 'Blind Ranking',
    description: "Rank items without seeing others' choices",
  },
  {
    value: 'daily_challenge',
    label: 'Daily Challenge',
    description: 'A new challenge that resets each day',
  },
];

export function CreateChallengeModal({
  isOpen,
  onClose,
  onSubmit,
  listId,
  listTitle,
}: CreateChallengeModalProps) {
  const { draftChallenge, updateDraftChallenge, clearDraft } = useChallengeStore();

  const [title, setTitle] = useState(draftChallenge?.title || `${listTitle} Challenge`);
  const [description, setDescription] = useState(draftChallenge?.description || '');
  const [selectedType, setSelectedType] = useState<ChallengeType>(
    (draftChallenge?.config?.type as ChallengeType) || 'beat_my_ranking'
  );
  const [timeLimit, setTimeLimit] = useState<number | undefined>(
    draftChallenge?.config?.timeLimit
  );
  const [visibility, setVisibility] = useState<'public' | 'private' | 'link_only' | 'invite_only'>(
    draftChallenge?.config?.visibility || 'link_only'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        listId,
        config: {
          type: selectedType,
          timeLimit: timeLimit ? timeLimit * 60 : undefined, // Convert to seconds
          visibility,
        },
      });

      clearDraft();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Save draft
    updateDraftChallenge({
      title,
      description,
      listId,
      config: {
        type: selectedType,
        timeLimit: timeLimit ? timeLimit * 60 : undefined,
        visibility,
      },
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Create Challenge</h2>
              <button
                onClick={handleClose}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Challenge Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter challenge title"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your challenge..."
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>

              {/* Challenge Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Challenge Type
                </label>
                <div className="space-y-2">
                  {CHALLENGE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        selectedType === type.value
                          ? 'bg-zinc-800 border-zinc-600'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedType === type.value
                              ? 'border-emerald-500'
                              : 'border-zinc-600'
                          }`}
                        >
                          {selectedType === type.value && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-white">{type.label}</div>
                          <div className="text-sm text-zinc-400">{type.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Limit (for speed ranking) */}
              {selectedType === 'speed_ranking' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={timeLimit || ''}
                    onChange={(e) =>
                      setTimeLimit(e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    placeholder="5"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              )}

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Visibility
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'public', label: 'Public' },
                    { value: 'link_only', label: 'Link Only' },
                    { value: 'invite_only', label: 'Invite Only' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setVisibility(option.value as typeof visibility)
                      }
                      className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                        visibility === option.value
                          ? 'bg-zinc-700 border-zinc-600 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-2 text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Challenge'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
