"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Clock, X } from 'lucide-react';
import Image from 'next/image';
import { getYouTubeThumbnail, formatDuration } from '../utils/youtube';

interface YouTubeItem {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  duration: number;
  position: number;
  category: string;
  tags: string[];
}

interface YouTubeMediaItemProps {
  item: YouTubeItem;
  isActive: boolean; // Changed from isSelected
  currentTimestamp: number;
  onSelect: (id: string) => void;
  onTimestampChange: (timestamp: number) => void;
}

export function YouTubeMediaItem({ 
  item, 
  isActive, 
  currentTimestamp, 
  onSelect, 
  onTimestampChange 
}: YouTubeMediaItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get thumbnail URLs with fallbacks
  const thumbnailUrl = getYouTubeThumbnail(item.youtubeId, 'maxres');
  const fallbackThumbnailUrl = getYouTubeThumbnail(item.youtubeId, 'high');

  // Clean up when component becomes inactive
  useEffect(() => {
    if (!isActive && playerRef.current) {
      console.log(`🔄 Destroying player for ${item.title}`);
      
      // Stop tracking and clean up
      stopTimestampTracking();
      setIsPlaying(false);
      setPlayerReady(false);
      
      // Destroy the player
      if (typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
      playerRef.current = null;
    }
  }, [isActive, item.title]);

  // Initialize YouTube player when this item becomes active
  useEffect(() => {
    if (isActive && window.YT && !playerRef.current) {
      console.log(`🔄 Creating player for ${item.title}`);
      setIsLoading(true);
      
      // Small delay to ensure DOM element exists
      const timer = setTimeout(() => {
        try {
          playerRef.current = new window.YT.Player(`youtube-player-${item.id}`, {
            height: '100%',
            width: '100%',
            videoId: item.youtubeId,
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              iv_load_policy: 3,
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              origin: window.location.origin
            },
            events: {
              onReady: (event: any) => {
                console.log(`✅ Player ready for ${item.title}`);
                setIsLoading(false);
                setPlayerReady(true);
              },
              onStateChange: (event: any) => {
                const state = event.data;
                const isCurrentlyPlaying = state === window.YT.PlayerState.PLAYING;
                setIsPlaying(isCurrentlyPlaying);
                
                if (isCurrentlyPlaying) {
                  startTimestampTracking();
                } else {
                  stopTimestampTracking();
                }
              },
              onError: (event: any) => {
                console.error(`❌ YouTube player error for ${item.title}:`, event.data);
                setIsLoading(false);
              }
            }
          });
        } catch (error) {
          console.error(`❌ Failed to create player for ${item.title}:`, error);
          setIsLoading(false);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isActive, item.id, item.youtubeId, item.title]);

  // Load YouTube API on first mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        console.log('🎬 YouTube API loaded globally');
      };
    }
  }, []);

  // Timestamp tracking
  const startTimestampTracking = useCallback(() => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const currentTime = playerRef.current.getCurrentTime();
          onTimestampChange(currentTime);
        } catch (error) {
          console.warn('Error getting current time:', error);
        }
      }
    }, 1000);
  }, [onTimestampChange]);

  const stopTimestampTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Control functions with error handling
  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current || !playerReady) return;
    
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (error) {
      console.error('Error toggling play:', error);
    }
  }, [isPlaying, playerReady]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current || !playerReady) return;
    
    try {
      if (isMuted) {
        playerRef.current.unMute();
      } else {
        playerRef.current.mute();
      }
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [isMuted, playerReady]);

  const seekTo = useCallback((percentage: number) => {
    if (!playerRef.current || !playerReady) return;
    
    try {
      const seekTime = (item.duration * percentage) / 100;
      playerRef.current.seekTo(seekTime, true);
      onTimestampChange(seekTime);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, [item.duration, onTimestampChange, playerReady]);

  const closePlayer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item.id); // This will deactivate the player
  }, [onSelect, item.id]);

  // Progress percentage
  const progressPercentage = Math.min((currentTimestamp / item.duration) * 100, 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        relative bg-slate-800 rounded-xl overflow-hidden cursor-pointer
        transition-all duration-300
        ${isActive 
          ? 'ring-2 ring-blue-500 shadow-2xl shadow-blue-500/20 scale-105' 
          : 'hover:scale-102 hover:shadow-xl'
        }
      `}
      onClick={() => onSelect(item.id)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Position Badge */}
      <div className="absolute top-3 left-3 z-20 bg-blue-600 text-white text-sm font-bold px-2 py-1 rounded">
        #{item.position}
      </div>

      {/* Close Button - only show when active */}
      {isActive && (
        <button
          onClick={closePlayer}
          className="absolute top-3 right-3 z-20 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full transition-colors"
          title="Close player"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Duration Badge */}
      {!isActive && (
        <div className="absolute top-3 right-3 z-20 bg-black/70 text-white text-sm px-2 py-1 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(item.duration)}
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative aspect-video bg-slate-700">
        {isActive ? (
          // YouTube Player Container
          <div className="relative w-full h-full">
            <div id={`youtube-player-${item.id}`} className="w-full h-full" />
            
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="text-white text-sm">Loading player...</span>
                </div>
              </div>
            )}

            {/* Custom Controls Overlay */}
            <AnimatePresence>
              {showControls && playerReady && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"
                >
                  {/* Control Buttons */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3 pointer-events-auto">
                    <button
                      onClick={togglePlay}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
                      disabled={!playerReady}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    
                    <button
                      onClick={toggleMute}
                      className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-full transition-colors"
                      disabled={!playerReady}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Timestamp Display */}
                  <div className="absolute bottom-4 right-4 bg-black/50 text-white text-sm px-2 py-1 rounded pointer-events-none">
                    {formatDuration(Math.floor(currentTimestamp))} / {formatDuration(item.duration)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress Bar */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1 bg-slate-600 cursor-pointer z-10"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                seekTo(percentage);
              }}
            >
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        ) : (
          // Thumbnail View
          <div className="relative w-full h-full group">
            <Image
              src={thumbnailError ? fallbackThumbnailUrl : thumbnailUrl}
              alt={item.title}
              fill
              className="object-cover"
              onError={() => setThumbnailError(true)}
            />
            
            {/* Play Overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-blue-600 rounded-full p-4">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Item Information */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-1 line-clamp-2">
          {item.title}
        </h3>
        <p className="text-slate-400 text-sm mb-3 line-clamp-2">
          {item.description}
        </p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index}
              className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}