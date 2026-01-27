'use client';

/**
 * AudioPlayer
 *
 * Spotify-style mini-player fixed at bottom of viewport.
 * Portal-rendered to escape CSS transforms.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  X,
  Volume2,
  VolumeX,
  Loader2,
  Music,
  AlertCircle,
} from 'lucide-react';
import {
  useAudioStore,
  useAudioPlayback,
  useAudioControls,
  useAudioVolume,
  useAudioPlayer,
} from '@/stores/audio-store';
import { formatDuration, getYouTubeThumbnail } from '@/lib/youtube';
import { YouTubeEmbed } from './YouTubeEmbed';
import { cn } from '@/lib/utils';

export function AudioPlayer() {
  const [mounted, setMounted] = useState(false);

  const { isVisible } = useAudioPlayer();
  const { isPlaying, isPaused, currentItem, currentTime, duration, isLoading, error } =
    useAudioPlayback();
  const { pause, resume, stop } = useAudioControls();
  const { volume, isMuted, setVolume, toggleMute } = useAudioVolume();

  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle seek
  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const newTime = percent * duration;

      useAudioStore.getState().seek(newTime);
    },
    [duration]
  );

  // Handle volume change
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(parseInt(e.target.value, 10));
    },
    [setVolume]
  );

  // Handle close
  const handleClose = useCallback(() => {
    stop();
  }, [stop]);

  // Toggle play/pause
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  if (!mounted || !isVisible || !currentItem) {
    return <YouTubeEmbed />;
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const thumbnailUrl = currentItem.youtube_id
    ? getYouTubeThumbnail(currentItem.youtube_id, 'default')
    : null;

  const playerContent = (
    <>
      {/* Hidden YouTube player */}
      <YouTubeEmbed />

      {/* Mini-player UI */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-gray-900/95 backdrop-blur-xl',
          'border-t border-gray-800/50',
          'shadow-2xl shadow-black/50'
        )}
      >
        {/* Progress bar (clickable) */}
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gray-800 cursor-pointer group"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          {/* Hover indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400
              opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-cyan-500/50"
            style={{ left: `${progress}%`, transform: `translateX(-50%) translateY(-50%)` }}
          />
        </div>

        {/* Player content */}
        <div className="flex items-center gap-4 px-4 py-3">
          {/* Thumbnail */}
          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={currentItem.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-5 h-5 text-gray-600" />
              </div>
            )}
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentItem.title}
            </p>
            {currentItem.artist && (
              <p className="text-xs text-gray-400 truncate">
                {currentItem.artist}
              </p>
            )}
            {/* Time display */}
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDuration(Math.floor(currentTime))}
              {duration > 0 && ` / ${formatDuration(Math.floor(duration))}`}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4" />
              <span className="max-w-[150px] truncate">{error}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                'bg-cyan-500 hover:bg-cyan-400 text-white',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            {/* Volume control */}
            <div
              className="relative"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Volume slider popup */}
              {showVolumeSlider && (
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3
                    bg-gray-800 rounded-lg shadow-xl border border-gray-700"
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-3
                      [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-cyan-400"
                  />
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Close player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(playerContent, document.body);
}
