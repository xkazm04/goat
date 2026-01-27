/**
 * Audio Store
 *
 * Manages YouTube audio playback state for Music category items.
 * Uses YouTube IFrame API for audio-only playback via hidden player.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loadYouTubeAPI, extractYouTubeId } from '@/lib/youtube';
import { apiClient } from '@/lib/api';
import type { YouTubePlayer } from '@/types/youtube';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PlayableItem {
  id: string;
  title: string;
  artist?: string;
  image_url?: string | null;
  youtube_url?: string | null;
  youtube_id?: string | null;
}

interface FindYouTubeResponse {
  youtube_url: string | null;
  youtube_id: string | null;
  video_title?: string;
}

interface AudioStoreState {
  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  currentItem: PlayableItem | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;

  // Player visibility
  isPlayerVisible: boolean;

  // YouTube URL cache (itemId -> youtubeUrl)
  urlCache: Record<string, string>;

  // Actions
  play: (item: PlayableItem) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  hidePlayer: () => void;
  showPlayer: () => void;

  // Internal state updates
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;

  // URL management
  fetchYouTubeUrl: (item: PlayableItem) => Promise<string | null>;
  cacheUrl: (itemId: string, url: string) => void;
  getCachedUrl: (itemId: string) => string | null;

  // Player reference (internal)
  _playerRef: YouTubePlayer | null;
  _setPlayerRef: (player: YouTubePlayer | null) => void;
  _playerElementId: string;
}

// ─────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────

export const useAudioStore = create<AudioStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      isPlaying: false,
      isPaused: false,
      currentItem: null,
      currentTime: 0,
      duration: 0,
      volume: 80,
      isMuted: false,
      isLoading: false,
      error: null,
      isPlayerVisible: false,
      urlCache: {},

      // Player reference
      _playerRef: null,
      _playerElementId: 'youtube-audio-player',

      // ─────────────────────────────────────────────────────────
      // Playback Actions
      // ─────────────────────────────────────────────────────────

      play: async (item: PlayableItem) => {
        const state = get();

        // If same item and paused, just resume
        if (state.currentItem?.id === item.id && state.isPaused) {
          get().resume();
          return;
        }

        set({ isLoading: true, error: null, isPlayerVisible: true });

        try {
          // Get YouTube URL (from item, cache, or API)
          let youtubeUrl = item.youtube_url;
          let youtubeId = item.youtube_id;

          if (!youtubeUrl) {
            youtubeUrl = state.getCachedUrl(item.id);
          }

          if (!youtubeUrl) {
            youtubeUrl = await state.fetchYouTubeUrl(item);
          }

          if (!youtubeUrl) {
            throw new Error('Could not find YouTube video for this item');
          }

          // Extract video ID if we have URL but no ID
          if (!youtubeId && youtubeUrl) {
            youtubeId = extractYouTubeId(youtubeUrl);
          }

          if (!youtubeId) {
            throw new Error('Invalid YouTube URL');
          }

          // Load YouTube API if needed
          await loadYouTubeAPI();

          // Update current item with YouTube info
          const updatedItem: PlayableItem = {
            ...item,
            youtube_url: youtubeUrl,
            youtube_id: youtubeId,
          };

          set({
            currentItem: updatedItem,
            currentTime: 0,
            duration: 0,
            isLoading: false,
          });

          // Player creation/loading is handled by YouTubeEmbed component
          // It will call _setPlayerRef and manage the actual playback

        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to play',
          });
        }
      },

      pause: () => {
        const player = get()._playerRef;
        if (player) {
          player.pauseVideo();
        }
        set({ isPlaying: false, isPaused: true });
      },

      resume: () => {
        const player = get()._playerRef;
        if (player) {
          player.playVideo();
        }
        set({ isPlaying: true, isPaused: false });
      },

      stop: () => {
        const player = get()._playerRef;
        if (player) {
          player.stopVideo();
        }
        set({
          isPlaying: false,
          isPaused: false,
          currentItem: null,
          currentTime: 0,
          duration: 0,
          isPlayerVisible: false,
        });
      },

      seek: (time: number) => {
        const player = get()._playerRef;
        if (player) {
          player.seekTo(time, true);
        }
        set({ currentTime: time });
      },

      setVolume: (volume: number) => {
        const clampedVolume = Math.max(0, Math.min(100, volume));
        const player = get()._playerRef;
        if (player) {
          player.setVolume(clampedVolume);
        }
        set({ volume: clampedVolume, isMuted: clampedVolume === 0 });
      },

      toggleMute: () => {
        const player = get()._playerRef;
        const isMuted = get().isMuted;

        if (player) {
          if (isMuted) {
            player.unMute();
          } else {
            player.mute();
          }
        }
        set({ isMuted: !isMuted });
      },

      hidePlayer: () => set({ isPlayerVisible: false }),
      showPlayer: () => set({ isPlayerVisible: true }),

      // ─────────────────────────────────────────────────────────
      // Internal State Updates (called by YouTubeEmbed)
      // ─────────────────────────────────────────────────────────

      setCurrentTime: (time: number) => set({ currentTime: time }),
      setDuration: (duration: number) => set({ duration }),
      setIsPlaying: (isPlaying: boolean) =>
        set({ isPlaying, isPaused: !isPlaying }),
      setError: (error: string | null) => set({ error }),
      setLoading: (isLoading: boolean) => set({ isLoading }),

      // ─────────────────────────────────────────────────────────
      // URL Management
      // ─────────────────────────────────────────────────────────

      fetchYouTubeUrl: async (item: PlayableItem): Promise<string | null> => {
        try {
          const response = await apiClient.post<FindYouTubeResponse>(
            '/studio/find-youtube',
            {
              title: item.title,
              artist: item.artist,
              context: 'song',
            }
          );

          if (response.youtube_url) {
            get().cacheUrl(item.id, response.youtube_url);
            return response.youtube_url;
          }

          return null;
        } catch {
          return null;
        }
      },

      cacheUrl: (itemId: string, url: string) => {
        set((state) => ({
          urlCache: { ...state.urlCache, [itemId]: url },
        }));
      },

      getCachedUrl: (itemId: string) => {
        return get().urlCache[itemId] || null;
      },

      // ─────────────────────────────────────────────────────────
      // Player Reference Management
      // ─────────────────────────────────────────────────────────

      _setPlayerRef: (player: YouTubePlayer | null) => {
        set({ _playerRef: player });
      },
    }),
    {
      name: 'audio-store',
      partialize: (state) => ({
        volume: state.volume,
        isMuted: state.isMuted,
        urlCache: state.urlCache,
      }),
    }
  )
);

// ─────────────────────────────────────────────────────────────
// Selector Hooks
// ─────────────────────────────────────────────────────────────

export const useAudioPlayback = () =>
  useAudioStore((state) => ({
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    currentItem: state.currentItem,
    currentTime: state.currentTime,
    duration: state.duration,
    isLoading: state.isLoading,
    error: state.error,
  }));

export const useAudioControls = () =>
  useAudioStore((state) => ({
    play: state.play,
    pause: state.pause,
    resume: state.resume,
    stop: state.stop,
    seek: state.seek,
  }));

export const useAudioVolume = () =>
  useAudioStore((state) => ({
    volume: state.volume,
    isMuted: state.isMuted,
    setVolume: state.setVolume,
    toggleMute: state.toggleMute,
  }));

export const useAudioPlayer = () =>
  useAudioStore((state) => ({
    isVisible: state.isPlayerVisible,
    hide: state.hidePlayer,
    show: state.showPlayer,
  }));

// Helper to check if an item is currently playing
export const useIsItemPlaying = (itemId: string) =>
  useAudioStore(
    (state) => state.isPlaying && state.currentItem?.id === itemId
  );
