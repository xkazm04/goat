'use client';

/**
 * PlayButton
 *
 * Reusable play/pause button for item cards.
 * Shows loading state when fetching YouTube URL.
 */

import { Play, Pause, Loader2, Music } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAudioStore, useIsItemPlaying, type PlayableItem } from '@/stores/audio-store';

interface PlayButtonProps {
  item: PlayableItem;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
  className?: string;
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function PlayButton({
  item,
  size = 'md',
  variant = 'icon',
  className,
  showLabel = false,
}: PlayButtonProps) {
  const play = useAudioStore((state) => state.play);
  const pause = useAudioStore((state) => state.pause);
  const resume = useAudioStore((state) => state.resume);
  const isLoading = useAudioStore((state) => state.isLoading);
  const currentItem = useAudioStore((state) => state.currentItem);
  const isPaused = useAudioStore((state) => state.isPaused);

  const isThisItemPlaying = useIsItemPlaying(item.id);
  const isThisItemCurrent = currentItem?.id === item.id;
  const isThisItemLoading = isThisItemCurrent && isLoading;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isThisItemLoading) return;

    if (isThisItemPlaying) {
      pause();
    } else if (isThisItemCurrent && isPaused) {
      resume();
    } else {
      play(item);
    }
  };

  const Icon = isThisItemLoading
    ? Loader2
    : isThisItemPlaying
      ? Pause
      : Play;

  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        disabled={isThisItemLoading}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'bg-brand/20 hover:bg-brand/30',
          'text-brand-hover text-sm font-medium',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isThisItemPlaying && 'ring-2 ring-brand/50',
          className
        )}
      >
        <Icon
          className={cn(iconSizes[size], isThisItemLoading && 'animate-spin')}
        />
        {showLabel && (
          <span>{isThisItemPlaying ? 'Pause' : 'Play'}</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isThisItemLoading}
      className={cn(
        'flex items-center justify-center rounded-full',
        'bg-linear-to-br from-brand/30 to-brand-muted/20',
        'text-brand-hover hover:text-brand-hover',
        'border border-brand/30 hover:border-brand-hover/50',
        'transition-all duration-200',
        'hover:scale-105 hover:shadow-lg hover:shadow-brand/20',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        isThisItemPlaying && 'ring-2 ring-brand-hover/50 bg-brand/40',
        sizeClasses[size],
        className
      )}
      title={isThisItemPlaying ? 'Pause' : 'Play preview'}
    >
      <Icon
        className={cn(iconSizes[size], isThisItemLoading && 'animate-spin')}
      />
    </button>
  );
}

/**
 * MusicIndicator
 *
 * Small indicator shown on music items to indicate they are playable.
 */
export function MusicIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center w-5 h-5',
        'rounded-full bg-brand/20',
        'text-brand-hover',
        className
      )}
    >
      <Music className="w-3 h-3" />
    </div>
  );
}
