'use client';

/**
 * YouTubeEmbed
 *
 * Hidden YouTube player component that manages the YouTube IFrame API.
 * Syncs playback state to the audio store.
 */

import { useEffect, useRef, useCallback } from 'react';
import { loadYouTubeAPI } from '@/lib/youtube';
import { useAudioStore } from '@/stores/audio-store';
import type { YouTubePlayer } from '@/types/youtube';

export function YouTubeEmbed() {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  const currentItem = useAudioStore((state) => state.currentItem);
  const volume = useAudioStore((state) => state.volume);
  const isMuted = useAudioStore((state) => state.isMuted);
  const _setPlayerRef = useAudioStore((state) => state._setPlayerRef);
  const setCurrentTime = useAudioStore((state) => state.setCurrentTime);
  const setDuration = useAudioStore((state) => state.setDuration);
  const setIsPlaying = useAudioStore((state) => state.setIsPlaying);
  const setLoading = useAudioStore((state) => state.setLoading);
  const setError = useAudioStore((state) => state.setError);

  // Start time tracking interval
  const startTimeTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 250);
  }, [setCurrentTime]);

  // Stop time tracking
  const stopTimeTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle player state changes
  const handleStateChange = useCallback(
    (event: { data: number }) => {
      if (!window.YT) return;

      switch (event.data) {
        case window.YT.PlayerState.PLAYING:
          setIsPlaying(true);
          setLoading(false);
          startTimeTracking();
          break;
        case window.YT.PlayerState.PAUSED:
          setIsPlaying(false);
          stopTimeTracking();
          break;
        case window.YT.PlayerState.ENDED:
          setIsPlaying(false);
          stopTimeTracking();
          setCurrentTime(0);
          break;
        case window.YT.PlayerState.BUFFERING:
          setLoading(true);
          break;
        case window.YT.PlayerState.CUED:
          setLoading(false);
          break;
      }
    },
    [setIsPlaying, setLoading, startTimeTracking, stopTimeTracking, setCurrentTime]
  );

  // Handle player ready
  const handleReady = useCallback(
    (event: { target: YouTubePlayer }) => {
      const player = event.target;
      playerRef.current = player;
      _setPlayerRef(player);

      // Set initial volume
      player.setVolume(volume);
      if (isMuted) {
        player.mute();
      }

      // Get duration
      const duration = player.getDuration();
      if (duration > 0) {
        setDuration(duration);
      }

      // Start playing
      player.playVideo();
      setLoading(false);
    },
    [volume, isMuted, _setPlayerRef, setDuration, setLoading]
  );

  // Handle player error
  const handleError = useCallback(
    (event: { data: number }) => {
      const errorMessages: Record<number, string> = {
        2: 'Invalid video ID',
        5: 'HTML5 player error',
        100: 'Video not found',
        101: 'Video cannot be embedded',
        150: 'Video cannot be embedded',
      };

      setError(errorMessages[event.data] || 'Playback error');
      setLoading(false);
    },
    [setError, setLoading]
  );

  // Initialize or update player when video changes
  useEffect(() => {
    if (!currentItem?.youtube_id) {
      // No video to play, destroy existing player
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        _setPlayerRef(null);
      }
      stopTimeTracking();
      return;
    }

    const initPlayer = async () => {
      setLoading(true);

      try {
        await loadYouTubeAPI();

        // If player exists, just load new video
        if (playerRef.current) {
          playerRef.current.loadVideoById(currentItem.youtube_id!);
          return;
        }

        // Create container element if needed
        if (!containerRef.current) return;

        // Clear any existing content
        containerRef.current.innerHTML = '';

        // Create a new div for the player
        const playerElement = document.createElement('div');
        playerElement.id = 'yt-audio-player';
        containerRef.current.appendChild(playerElement);

        // Create new player
        new window.YT.Player('yt-audio-player', {
          height: '0',
          width: '0',
          videoId: currentItem.youtube_id,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
          },
          events: {
            onReady: handleReady,
            onStateChange: handleStateChange,
            onError: handleError,
          },
        });
      } catch (error) {
        setError('Failed to load YouTube player');
        setLoading(false);
      }
    };

    initPlayer();

    return () => {
      stopTimeTracking();
    };
  }, [
    currentItem?.youtube_id,
    handleReady,
    handleStateChange,
    handleError,
    setLoading,
    setError,
    stopTimeTracking,
    _setPlayerRef,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimeTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
        _setPlayerRef(null);
      }
    };
  }, [stopTimeTracking, _setPlayerRef]);

  // Hidden container for the YouTube player
  return (
    <div
      ref={containerRef}
      className="fixed -left-[9999px] -top-[9999px] w-0 h-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    />
  );
}
