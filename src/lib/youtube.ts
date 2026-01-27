/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Get YouTube thumbnail URL for different qualities
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string {
  const qualityMap: Record<string, string> = {
    'default': 'default',
    'medium': 'mqdefault',
    'high': 'hqdefault',
    'standard': 'sddefault',
    'maxres': 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Format seconds to MM:SS or HH:MM:SS format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    // Less than an hour: show MM:SS
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    // More than an hour: show HH:MM:SS
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Load YouTube API dynamically
 * Returns a promise that resolves when the API is ready
 */
let youtubeApiPromise: Promise<void> | null = null;

export function loadYouTubeAPI(): Promise<void> {
  // Return existing promise if already loading
  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  // If already loaded, resolve immediately
  if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
    return Promise.resolve();
  }

  youtubeApiPromise = new Promise((resolve, reject) => {
    // Check if script is already added
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');

    if (existingScript) {
      // Script exists but YT not ready - wait for it
      const checkYT = () => {
        if (window.YT && window.YT.Player) {
          resolve();
        } else {
          setTimeout(checkYT, 100);
        }
      };
      checkYT();
      return;
    }

    // Set up callback before adding script
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousCallback) {
        previousCallback();
      }
      resolve();
    };

    // Add the script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => {
      youtubeApiPromise = null;
      reject(new Error('Failed to load YouTube API'));
    };

    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag?.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else {
      document.head.appendChild(tag);
    }

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!window.YT || !window.YT.Player) {
        youtubeApiPromise = null;
        reject(new Error('YouTube API load timeout'));
      }
    }, 10000);
  });

  return youtubeApiPromise;
}

/**
 * Validate YouTube video ID
 */
export function isValidYouTubeId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}