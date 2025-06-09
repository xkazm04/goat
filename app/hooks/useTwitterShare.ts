'use client';

import { useCallback } from 'react';

interface TwitterShareOptions {
  url?: string;
  text?: string;
  hashtags?: string[];
  via?: string;
}

export const useTwitterShare = () => {
  const shareOnTwitter = useCallback(({
    url = '',
    text = '',
    hashtags = [],
    via = ''
  }: TwitterShareOptions) => {
    // Get current URL if not provided
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    
    // Build Twitter URL parameters
    const params = new URLSearchParams();
    
    if (text) params.append('text', text);
    if (shareUrl) params.append('url', shareUrl);
    if (hashtags.length > 0) params.append('hashtags', hashtags.join(','));
    if (via) params.append('via', via);
    
    // Twitter Web Intent URL
    const twitterUrl = `https://twitter.com/intent/tweet?${params.toString()}`;
    
    // Open in new window
    if (typeof window !== 'undefined') {
      window.open(
        twitterUrl,
        'twitter-share',
        'width=550,height=400,resizable=yes,scrollbars=yes'
      );
    }
  }, []);

  return { shareOnTwitter };
};