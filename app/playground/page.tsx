"use client";

import { useState, useCallback } from 'react';
import { YouTubeMediaItem } from './components/YouTubeMediaItem';

// Sample YouTube data for testing
const sampleYouTubeItems = [
  {
    id: 'yt-1',
    title: 'The Beatles - Hey Jude',
    description: 'Classic rock anthem from The Beatles',
    youtubeId: 'A_MjCqQoLLA',
    duration: 431, // 7:11 in seconds
    position: 1,
    category: 'music',
    tags: ['rock', 'classic', '1960s']
  },
  {
    id: 'yt-2',
    title: 'Queen - Bohemian Rhapsody',
    description: 'Epic rock opera by Queen',
    youtubeId: 'fJ9rUzIMcZQ',
    duration: 355, // 5:55 in seconds
    position: 2,
    category: 'music',
    tags: ['rock', 'opera', '1970s']
  },
  {
    id: 'yt-3',
    title: 'Michael Jackson - Thriller',
    description: 'Iconic music video and song',
    youtubeId: 'sOnqjkJTMaA',
    duration: 357, // 5:57 in seconds
    position: 3,
    category: 'music',
    tags: ['pop', 'dance', '1980s']
  }
];

export default function PlaygroundPage() {
  const [activePlayer, setActivePlayer] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);

  // Only allow one active player at a time
  const handlePlayerSelect = useCallback((itemId: string) => {
    if (activePlayer === itemId) {
      // Clicking the same item closes it
      setActivePlayer(null);
      setCurrentTimestamp(0);
    } else {
      // Switch to new player (this will destroy the previous one)
      setActivePlayer(itemId);
      setCurrentTimestamp(0);
    }
  }, [activePlayer]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">YouTube Media Grid Prototype</h1>
        <p className="text-slate-400 mb-4">Only one video can play at a time for optimal performance</p>
        
        {/* Performance Info */}
        <div className="mb-6 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
          <p className="text-blue-200 text-sm">
            🚀 Performance Mode: {activePlayer ? '1 active player' : 'All thumbnails'} 
            {activePlayer && ` (${sampleYouTubeItems.find(item => item.id === activePlayer)?.title})`}
          </p>
        </div>
        
        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sampleYouTubeItems.map((item) => (
            <YouTubeMediaItem
              key={item.id}
              item={item}
              isActive={activePlayer === item.id}
              currentTimestamp={activePlayer === item.id ? currentTimestamp : 0}
              onSelect={handlePlayerSelect}
              onTimestampChange={setCurrentTimestamp}
            />
          ))}
        </div>

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-slate-800 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Debug Info</h3>
          <div className="text-sm text-slate-300">
            <p>Active Player: {activePlayer || 'None'}</p>
            <p>Current Timestamp: {Math.floor(currentTimestamp)}s</p>
            <p>Total Items: {sampleYouTubeItems.length}</p>
            <p>Embedded Players: {activePlayer ? 1 : 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}