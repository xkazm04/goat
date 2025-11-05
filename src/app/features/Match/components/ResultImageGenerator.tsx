'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { GridItemType } from '@/types/match';
import { ImageStyle, generateResultImagePrompt, getStyleConfig } from '../lib/resultImagePrompt';
import { getCachedResultImage, saveCachedResultImage } from '../lib/resultCache';
import { generateShareMetadata, getSocialPlatforms, openShareDialog, shareViaWebAPI } from '../lib/socialShareIntegration';
import { ResultImageDownload } from './ResultImageDownload';
import html2canvas from 'html2canvas';

interface ResultImageGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  gridItems: GridItemType[];
  listMetadata: {
    title: string;
    category: string;
    subcategory?: string;
    size: number;
    timePeriod?: string;
    selectedDecade?: number;
    selectedYear?: number;
  };
}

type GenerationState = 'idle' | 'checking-cache' | 'generating' | 'complete' | 'error';

export function ResultImageGenerator({
  isOpen,
  onClose,
  gridItems,
  listMetadata,
}: ResultImageGeneratorProps) {
  const [state, setState] = useState<GenerationState>('idle');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('modern');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const matchedItems = gridItems.filter(item => item.matched && item.title);
  const shareConfig = generateShareMetadata(gridItems, listMetadata);
  const socialPlatforms = getSocialPlatforms();

  useEffect(() => {
    if (isOpen) {
      setState('idle');
      setError(null);
      checkCache();
    }
  }, [isOpen]);

  const checkCache = async () => {
    setState('checking-cache');
    try {
      const cached = await getCachedResultImage(gridItems, listMetadata);
      if (cached && cached.metadata.style === selectedStyle) {
        setGeneratedImageUrl(cached.imageData);
        setState('complete');
      } else {
        setState('idle');
      }
    } catch (err) {
      console.error('Cache check failed:', err);
      setState('idle');
    }
  };

  const generateParticles = () => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(newParticles);
  };

  const generateImage = async () => {
    if (matchedItems.length === 0) {
      setError('No items to generate image from');
      return;
    }

    setState('generating');
    setError(null);
    generateParticles();

    try {
      // Simulate progressive rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate image using canvas from the preview
      if (canvasRef.current) {
        const canvas = await html2canvas(canvasRef.current, {
          backgroundColor: null,
          scale: 2,
          logging: false,
        });

        const imageData = canvas.toDataURL('image/png');
        setGeneratedImageUrl(imageData);

        // Save to cache
        await saveCachedResultImage(
          gridItems,
          listMetadata,
          imageData,
          selectedStyle
        );

        setState('complete');
      } else {
        throw new Error('Canvas reference not available');
      }
    } catch (err) {
      console.error('Image generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
      setState('error');
    }
  };

  const handleStyleChange = (style: ImageStyle) => {
    setSelectedStyle(style);
    setGeneratedImageUrl(null);
    setState('idle');
  };

  const handleShare = async (platform: string) => {
    if (!generatedImageUrl) return;

    try {
      // Try Web Share API first (mobile)
      const blob = await (await fetch(generatedImageUrl)).blob();
      const shared = await shareViaWebAPI({ ...shareConfig, imageUrl: generatedImageUrl }, blob);

      if (!shared) {
        // Fallback to platform-specific sharing
        openShareDialog(platform, { ...shareConfig, imageUrl: generatedImageUrl });
      }
    } catch (error) {
      console.error('Share failed:', error);
      openShareDialog(platform, { ...shareConfig, imageUrl: generatedImageUrl });
    }
  };

  const handleDownload = () => {
    setIsDownloadModalOpen(true);
  };

  const styleConfig = getStyleConfig(selectedStyle);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                  Share Your Results
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Generate a stunning image of your {matchedItems.length} rankings
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Style Selector */}
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Style</h3>
                <div className="flex flex-wrap gap-3">
                  {(['minimalist', 'detailed', 'abstract', 'retro', 'modern'] as ImageStyle[]).map((style) => {
                    const config = getStyleConfig(style);
                    return (
                      <button
                        key={style}
                        onClick={() => handleStyleChange(style)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedStyle === style
                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {config.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview Area */}
              <div className="p-6 relative">
                {state === 'generating' && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
                    {particles.map((particle) => (
                      <motion.div
                        key={particle.id}
                        initial={{ x: `${particle.x}%`, y: `${particle.y}%`, opacity: 0, scale: 0 }}
                        animate={{
                          x: '50%',
                          y: '50%',
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0],
                        }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        className="absolute w-2 h-2 rounded-full bg-blue-400"
                      />
                    ))}
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                      <p className="text-white font-semibold">Generating your image...</p>
                    </div>
                  </div>
                )}

                {state === 'complete' && generatedImageUrl ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="space-y-4"
                  >
                    <img
                      src={generatedImageUrl}
                      alt="Generated ranking"
                      className="w-full rounded-lg shadow-2xl"
                    />
                  </motion.div>
                ) : (
                  <div
                    ref={canvasRef}
                    className="bg-gradient-to-br rounded-lg shadow-xl p-8"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${styleConfig.colorPalette[0]}, ${styleConfig.colorPalette[1]})`,
                    }}
                  >
                    {/* Preview of the image to be generated */}
                    <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-white">
                      <h1 className="text-3xl font-bold mb-2 text-center">{listMetadata.title}</h1>
                      <p className="text-sm opacity-80 text-center mb-6">
                        {listMetadata.category} • Top {matchedItems.length}
                      </p>

                      <div className="space-y-2">
                        {matchedItems.slice(0, 10).map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 bg-white/10 rounded-lg p-3"
                          >
                            <span className="text-2xl font-bold opacity-60 min-w-[40px]">
                              {index + 1}
                            </span>
                            <span className="flex-1 font-medium">{item.title}</span>
                          </div>
                        ))}
                        {matchedItems.length > 10 && (
                          <p className="text-center text-sm opacity-70 pt-2">
                            ...and {matchedItems.length - 10} more
                          </p>
                        )}
                      </div>

                      <div className="mt-6 text-center text-xs opacity-60">
                        Created with GOAT
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
                    {error}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-gray-700 space-y-4">
                {state === 'complete' && generatedImageUrl ? (
                  <>
                    {/* Download & Regenerate */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleDownload}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        Download
                      </button>
                      <button
                        onClick={generateImage}
                        className="px-6 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Remix
                      </button>
                    </div>

                    {/* Share Buttons */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Share on Social Media
                      </h4>
                      <div className="grid grid-cols-5 gap-3">
                        {socialPlatforms.map((platform) => (
                          <button
                            key={platform.name}
                            onClick={() => handleShare(platform.name)}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors text-sm"
                            style={{ borderBottom: `3px solid ${platform.color}` }}
                          >
                            {platform.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={generateImage}
                    disabled={state === 'generating' || matchedItems.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {state === 'generating' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Image
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Download Modal */}
          {generatedImageUrl && (
            <ResultImageDownload
              isOpen={isDownloadModalOpen}
              onClose={() => setIsDownloadModalOpen(false)}
              imageUrl={generatedImageUrl}
              metadata={listMetadata}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
