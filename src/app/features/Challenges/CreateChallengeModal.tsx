'use client';

/**
 * CreateChallengeModal Component
 * Modal for creating a new challenge
 */

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GlassModal,
  GlassModalHeader,
  GlassModalBody,
  GlassModalFooter,
  GLASS_INPUT_CLASS,
  GLASS_BUTTON_PRIMARY,
  GLASS_BUTTON_SECONDARY,
} from '@/components/ui/glass-modal';
import { useChallengeStore } from '@/stores/challenge-store';
import {
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
    <GlassModal open={isOpen} onClose={handleClose} size="sm:w-[512px]">
      <GlassModalHeader
        icon={Trophy}
        title="Create Challenge"
        onClose={handleClose}
      />

      <GlassModalBody className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Challenge Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter challenge title"
            className={GLASS_INPUT_CLASS}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your challenge..."
            rows={3}
            className={`${GLASS_INPUT_CLASS} resize-none`}
          />
        </div>

        {/* Challenge Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Challenge Type
          </label>
          <div className="space-y-2">
            {CHALLENGE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={cn(
                  'w-full p-3 text-left rounded-card border transition-colors',
                  selectedType === type.value
                    ? 'bg-gray-800/60 border-white/15'
                    : 'bg-gray-900/40 border-white/[0.08] hover:border-white/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      selectedType === type.value
                        ? 'border-amber-500'
                        : 'border-gray-600'
                    )}
                  >
                    {selectedType === type.value && (
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-white">{type.label}</div>
                    <div className="text-sm text-gray-400">{type.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Time Limit (for speed ranking) */}
        {selectedType === 'speed_ranking' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
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
              className={GLASS_INPUT_CLASS}
            />
          </div>
        )}

        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
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
                className={cn(
                  'flex-1 py-2 text-sm rounded-control border transition-colors',
                  visibility === option.value
                    ? 'bg-gray-800/60 border-white/15 text-white'
                    : 'bg-gray-900/40 border-white/[0.08] text-gray-400 hover:border-white/10'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-card text-red-400 text-sm">
            {error}
          </div>
        )}
      </GlassModalBody>

      <GlassModalFooter>
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className={cn(GLASS_BUTTON_SECONDARY, 'flex-1')}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              GLASS_BUTTON_PRIMARY,
              'flex-1',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Creating...' : 'Create Challenge'}
          </button>
        </div>
      </GlassModalFooter>
    </GlassModal>
  );
}
