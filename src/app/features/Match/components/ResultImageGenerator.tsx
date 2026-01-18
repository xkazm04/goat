'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, RefreshCw, Sparkles, Loader2, X, Clock, Wand2, Image as ImageIcon, Edit3 } from 'lucide-react';
import { ImageStyle, getStyleConfig, IMAGE_STYLE_KEYS } from '../lib/constants/image-styles';
import { getCachedResultImage, saveCachedResultImage } from '../lib/resultCache';
import { generateShareMetadata, getSocialPlatforms, openShareDialog, shareViaWebAPI } from '../lib/socialShareIntegration';
import { ResultImageDownload } from './ResultImageDownload';
import { AIStyleSelector } from './AIStyleSelector';
import { ImageEditor } from './ImageEditor';
import {
  FeedbackModal,
  FeedbackErrorState,
  FeedbackParticles,
  generateParticles as generateParticlesFn,
  useFeedbackPipeline,
} from '@/lib/feedback-pipeline';
import type { ParticleConfig } from '@/lib/feedback-pipeline';
import type { ResultImageGeneratorProps, ResultImageListMetadata } from '@/types/modal-props';
import { isResultImageGeneratorOpen } from '@/types/modal-props';
import type { AIStylePreset, GenerationProgress } from '../lib/ai/types';
import { generateAIImage, getCachedGeneration } from '../lib/aiImageGenerator';
import { DEFAULT_AI_STYLE } from '../lib/ai/stylePresets';

// html2canvas is dynamically imported when needed to reduce initial bundle size (~400KB)

// Re-export type for external use
export type { ResultImageListMetadata };

// Generation mode types
type GenerationMode = 'template' | 'ai';

// Progressive generation steps configuration for template mode
const GENERATION_STEPS = [
  { id: 'loading', label: 'Loading image generator...', duration: 150 },
  { id: 'preparing', label: 'Preparing your rankings...', duration: 400 },
  { id: 'styling', label: 'Applying style...', duration: 600 },
  { id: 'rendering', label: 'Rendering image...', duration: 800 },
  { id: 'finalizing', label: 'Finalizing image...', duration: 200 },
] as const;

// AI generation steps
const AI_GENERATION_STEPS = [
  { id: 'preparing', label: 'Preparing your rankings...', duration: 1000 },
  { id: 'prompting', label: 'Building AI prompt...', duration: 2000 },
  { id: 'generating', label: 'AI is creating your artwork...', duration: 15000 },
  { id: 'processing', label: 'Processing generated image...', duration: 5000 },
  { id: 'finalizing', label: 'Finalizing your masterpiece...', duration: 2000 },
] as const;

const TOTAL_ESTIMATED_TIME = GENERATION_STEPS.reduce((acc, step) => acc + step.duration, 0);
const TOTAL_AI_ESTIMATED_TIME = AI_GENERATION_STEPS.reduce((acc, step) => acc + step.duration, 0);

interface ProgressiveLoadingStateProps {
  currentStepIndex: number;
  estimatedTimeRemaining: number;
  onCancel: () => void;
  isCancelling: boolean;
  mode?: GenerationMode;
  progressMessage?: string;
}

function ProgressiveLoadingState({
  currentStepIndex,
  estimatedTimeRemaining,
  onCancel,
  isCancelling,
  mode = 'template',
  progressMessage,
}: ProgressiveLoadingStateProps) {
  const steps = mode === 'ai' ? AI_GENERATION_STEPS : GENERATION_STEPS;
  const currentStep = steps[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;
  const displayMessage = progressMessage || currentStep?.label || 'Processing...';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl"
      data-testid="progressive-loading-overlay"
    >
      <div className="flex flex-col items-center justify-center text-center py-10 px-6 max-w-sm">
        {/* Animated spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="mb-4"
        >
          {mode === 'ai' ? (
            <Wand2 className="w-10 h-10 text-purple-400" />
          ) : (
            <Loader2 className="w-10 h-10 text-blue-400" />
          )}
        </motion.div>

        {/* Mode indicator */}
        {mode === 'ai' && (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/30 text-purple-300 rounded-full mb-2">
            AI POWERED
          </span>
        )}

        {/* Current step message with animation */}
        <AnimatePresence mode="wait">
          <motion.p
            key={displayMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="font-medium text-white text-base mb-2"
            data-testid="generation-step-label"
          >
            {displayMessage}
          </motion.p>
        </AnimatePresence>

        {/* Step indicators */}
        <div className="flex gap-2 mb-4" data-testid="generation-step-indicators">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                index < currentStepIndex
                  ? 'bg-green-500'
                  : index === currentStepIndex
                  ? 'bg-blue-400'
                  : 'bg-gray-600'
              }`}
              initial={false}
              animate={
                index === currentStepIndex
                  ? { scale: [1, 1.3, 1] }
                  : { scale: 1 }
              }
              transition={
                index === currentStepIndex
                  ? { duration: 0.6, repeat: Infinity }
                  : {}
              }
              data-testid={`step-indicator-${step.id}`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-48 mb-3">
          <div className="w-full bg-gray-700 rounded-full overflow-hidden h-1.5">
            <motion.div
              className="h-full rounded-full bg-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Estimated time remaining */}
        <div
          className="flex items-center gap-1.5 text-xs text-gray-400 mb-4"
          data-testid="estimated-time-remaining"
        >
          <Clock className="w-3.5 h-3.5" />
          <span>
            {estimatedTimeRemaining > 0
              ? `~${Math.ceil(estimatedTimeRemaining / 1000)}s remaining`
              : 'Almost done...'}
          </span>
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          disabled={isCancelling}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="cancel-generation-btn"
        >
          <X className="w-4 h-4" />
          {isCancelling ? 'Cancelling...' : 'Cancel'}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Result Image Generator Modal
 *
 * Uses discriminated union props: when isOpen=true, gridItems and listMetadata are required
 */
export function ResultImageGenerator(props: ResultImageGeneratorProps) {
  const { isOpen, onClose } = props;

  // Use type guard to safely access required props when modal is open
  const isOpenState = isResultImageGeneratorOpen(props);
  const gridItems = isOpenState ? props.gridItems : [];
  const listMetadata = isOpenState ? props.listMetadata : {
    title: '',
    category: '',
    size: 0,
  };
  // Generation mode: template (fast, local) or AI (slower, more unique)
  const [generationMode, setGenerationMode] = useState<GenerationMode>('template');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>('modern');
  const [selectedAIStyle, setSelectedAIStyle] = useState<AIStylePreset>(DEFAULT_AI_STYLE);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [particles, setParticles] = useState<ParticleConfig[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(TOTAL_ESTIMATED_TIME);
  const [isCancelling, setIsCancelling] = useState(false);
  const [aiProgressMessage, setAIProgressMessage] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);

  const matchedItems = gridItems.filter(item => item.matched && item.title);
  const shareConfig = generateShareMetadata(gridItems, listMetadata);
  const socialPlatforms = getSocialPlatforms();

  // Cancel handler
  const handleCancel = useCallback(() => {
    setIsCancelling(true);
    cancelledRef.current = true;
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      cancelledRef.current = false;
      setIsCancelling(false);
      setCurrentStepIndex(0);
      setEstimatedTimeRemaining(generationMode === 'ai' ? TOTAL_AI_ESTIMATED_TIME : TOTAL_ESTIMATED_TIME);
      setAIProgressMessage('');
    }
  }, [isOpen, generationMode]);

  // Handle mode change
  const handleModeChange = useCallback((mode: GenerationMode) => {
    setGenerationMode(mode);
    setGeneratedImageUrl(null);
    setEstimatedTimeRemaining(mode === 'ai' ? TOTAL_AI_ESTIMATED_TIME : TOTAL_ESTIMATED_TIME);
  }, []);

  // AI progress handler
  const handleAIProgress = useCallback((progress: GenerationProgress) => {
    setAIProgressMessage(progress.message);
    if (progress.estimatedTimeRemaining !== undefined) {
      setEstimatedTimeRemaining(progress.estimatedTimeRemaining);
    }
    // Map progress to step index
    const stepIndex = Math.floor((progress.progress / 100) * AI_GENERATION_STEPS.length);
    setCurrentStepIndex(Math.min(stepIndex, AI_GENERATION_STEPS.length - 1));
  }, []);

  // Use the feedback pipeline for image generation
  const {
    state,
    error,
    isProcessing,
    isSuccess,
    isError,
    execute,
    reset,
    setState,
  } = useFeedbackPipeline<void, string>({
    id: 'result-image-generator',
    operation: async () => {
      if (matchedItems.length === 0) {
        throw new Error('No items to generate image from');
      }

      // Reset cancellation state at start
      cancelledRef.current = false;
      setIsCancelling(false);
      setCurrentStepIndex(0);
      setAIProgressMessage('');

      // Generate particles for visual feedback
      setParticles(generateParticlesFn(20, { xRange: [0, 100], yRange: [0, 100] }));

      // AI Generation Mode
      if (generationMode === 'ai') {
        setEstimatedTimeRemaining(TOTAL_AI_ESTIMATED_TIME);

        // Build AI generation request
        const aiRequest = {
          listTitle: listMetadata.title,
          category: listMetadata.category,
          items: matchedItems.slice(0, 10).map((item, index) => ({
            position: index + 1,
            title: item.title || '',
          })),
          style: selectedAIStyle,
          customPrompt: customPrompt || undefined,
          dimensions: { width: 1200, height: 630 },
        };

        // Check cache first
        const cached = getCachedGeneration(aiRequest);
        if (cached && cached.images.length > 0) {
          return cached.images[0].url;
        }

        // Generate with AI
        const result = await generateAIImage(aiRequest, handleAIProgress, {
          provider: 'mock', // Use mock by default, can be changed to 'replicate' or 'openai'
        });

        if (cancelledRef.current) {
          throw new Error('Generation cancelled');
        }

        if (result.images.length === 0) {
          // Fallback to template mode
          setGenerationMode('template');
          throw new Error('AI generation unavailable, please try template mode');
        }

        return result.images[0].url;
      }

      // Template Generation Mode (existing logic)
      setEstimatedTimeRemaining(TOTAL_ESTIMATED_TIME);
      let remainingTime = TOTAL_ESTIMATED_TIME;

      // Dynamic import of html2canvas to reduce initial bundle size (~400KB)
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      // Check cancellation after library load
      if (cancelledRef.current) {
        throw new Error('Generation cancelled');
      }

      for (let i = 1; i < GENERATION_STEPS.length; i++) {
        if (cancelledRef.current) {
          throw new Error('Generation cancelled');
        }

        setCurrentStepIndex(i);
        remainingTime -= GENERATION_STEPS[i - 1].duration;
        setEstimatedTimeRemaining(remainingTime);

        // Perform actual work on specific steps
        if (i === 3) {
          // Rendering step - do the actual canvas capture
          if (!canvasRef.current) {
            throw new Error('Canvas reference not available');
          }

          const canvas = await html2canvas(canvasRef.current, {
            backgroundColor: null,
            scale: 2,
            logging: false,
          });

          // Check cancellation after heavy operation
          if (cancelledRef.current) {
            throw new Error('Generation cancelled');
          }

          const imageData = canvas.toDataURL('image/png');

          // Move to finalizing step
          setCurrentStepIndex(4);
          setEstimatedTimeRemaining(GENERATION_STEPS[4].duration);

          // Save to cache
          await saveCachedResultImage(gridItems, listMetadata, imageData, selectedStyle);

          return imageData;
        } else {
          // Simulated step duration for visual feedback
          await new Promise(resolve => setTimeout(resolve, GENERATION_STEPS[i].duration));
        }
      }

      throw new Error('Unexpected end of generation');
    },
    onSuccess: (imageData) => {
      setGeneratedImageUrl(imageData);
      setParticles([]);
      const steps = generationMode === 'ai' ? AI_GENERATION_STEPS : GENERATION_STEPS;
      setCurrentStepIndex(steps.length);
      setEstimatedTimeRemaining(0);
      setAIProgressMessage('');
    },
    onError: () => {
      setParticles([]);
      setIsCancelling(false);
      setCurrentStepIndex(0);
      setEstimatedTimeRemaining(generationMode === 'ai' ? TOTAL_AI_ESTIMATED_TIME : TOTAL_ESTIMATED_TIME);
      setAIProgressMessage('');
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset();
      checkCache();
    }
  }, [isOpen]);

  const checkCache = async () => {
    setState('checking-cache');
    try {
      const cached = await getCachedResultImage(gridItems, listMetadata);
      if (cached && cached.metadata.style === selectedStyle) {
        setGeneratedImageUrl(cached.imageData);
        setState('success');
      } else {
        setState('idle');
      }
    } catch (err) {
      console.error('Cache check failed:', err);
      setState('idle');
    }
  };

  const generateImage = () => {
    execute();
  };

  const handleStyleChange = (style: ImageStyle) => {
    setSelectedStyle(style);
    setGeneratedImageUrl(null);
    reset();
  };

  const handleShare = async (platform: string) => {
    if (!generatedImageUrl) return;

    try {
      const blob = await (await fetch(generatedImageUrl)).blob();
      const shared = await shareViaWebAPI({ ...shareConfig, imageUrl: generatedImageUrl }, blob);

      if (!shared) {
        openShareDialog(platform, { ...shareConfig, imageUrl: generatedImageUrl });
      }
    } catch (err) {
      console.error('Share failed:', err);
      openShareDialog(platform, { ...shareConfig, imageUrl: generatedImageUrl });
    }
  };

  const handleDownload = () => {
    setIsDownloadModalOpen(true);
  };

  const handleEditImage = () => {
    setIsEditorOpen(true);
  };

  const handleEditorApply = (editedUrl: string) => {
    setGeneratedImageUrl(editedUrl);
    setIsEditorOpen(false);
  };

  const handleAIStyleChange = (style: AIStylePreset) => {
    setSelectedAIStyle(style);
    setGeneratedImageUrl(null);
    reset();
  };

  const styleConfig = getStyleConfig(selectedStyle);

  return (
    <>
      <FeedbackModal
        isOpen={isOpen}
        onClose={onClose}
        title="Share Your Results"
        subtitle={`Generate a stunning image of your ${matchedItems.length} rankings`}
        headerIcon={<Sparkles className="w-5 h-5 text-yellow-400" />}
        size="lg"
      >
        {/* Particle effects during generation */}
        {isProcessing && <FeedbackParticles particles={particles} variant="dot" converge />}

        {/* Generation Mode Toggle */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-gray-300">Generation Mode</span>
          </div>
          <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl">
            <button
              onClick={() => handleModeChange('template')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                generationMode === 'template'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
              data-testid="mode-template"
            >
              <ImageIcon className="w-4 h-4" />
              Template
              <span className="text-[10px] opacity-70">(Fast)</span>
            </button>
            <button
              onClick={() => handleModeChange('ai')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                generationMode === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
              data-testid="mode-ai"
            >
              <Wand2 className="w-4 h-4" />
              AI Art
              <span className="text-[10px] opacity-70">(Unique)</span>
            </button>
          </div>
        </div>

        {/* Style Selector - changes based on mode */}
        <div className="mb-6">
          <AnimatePresence mode="wait">
            {generationMode === 'template' ? (
              <motion.div
                key="template-styles"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Select Style</h3>
                <div className="flex flex-wrap gap-3">
                  {IMAGE_STYLE_KEYS.map((style) => {
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
                        data-testid={`style-btn-${style}`}
                      >
                        {config.name}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="ai-styles"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AIStyleSelector
                  selectedStyle={selectedAIStyle}
                  onStyleChange={handleAIStyleChange}
                  category={listMetadata.category}
                  customPrompt={customPrompt}
                  onCustomPromptChange={setCustomPrompt}
                  aiAvailable={true}
                  loading={isProcessing}
                  compact
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview Area */}
        <div className="relative mb-6">
          <AnimatePresence>
            {isProcessing && (
              <ProgressiveLoadingState
                currentStepIndex={currentStepIndex}
                mode={generationMode}
                progressMessage={aiProgressMessage}
                estimatedTimeRemaining={estimatedTimeRemaining}
                onCancel={handleCancel}
                isCancelling={isCancelling}
              />
            )}
          </AnimatePresence>

          {isError && error && (
            <FeedbackErrorState
              message={error.message}
              onRetry={generateImage}
              inline
            />
          )}

          {isSuccess && generatedImageUrl ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
              data-testid="generated-image-container"
            >
              <img
                src={generatedImageUrl}
                alt="Generated ranking"
                className="w-full rounded-lg shadow-2xl"
                data-testid="generated-image"
              />
            </motion.div>
          ) : (
            <div
              ref={canvasRef}
              className="bg-gradient-to-br rounded-lg shadow-xl p-8"
              style={{
                backgroundImage: `linear-gradient(135deg, ${styleConfig.colorPalette[0]}, ${styleConfig.colorPalette[1]})`,
              }}
              data-testid="image-preview"
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
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {isSuccess && generatedImageUrl ? (
            <>
              {/* Download, Edit & Regenerate */}
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  data-testid="download-btn"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
                <button
                  onClick={handleEditImage}
                  className="px-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  data-testid="edit-btn"
                  title="Edit image"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={generateImage}
                  className="px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  data-testid="remix-btn"
                  title="Generate new variation"
                >
                  <RefreshCw className="w-5 h-5" />
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
                      data-testid={`share-btn-${platform.name.toLowerCase()}`}
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
              disabled={isProcessing || matchedItems.length === 0}
              className={`w-full text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-700 disabled:cursor-not-allowed ${
                generationMode === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              data-testid="generate-btn"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {generationMode === 'ai' ? 'Creating AI Art...' : 'Generating...'}
                </>
              ) : (
                <>
                  {generationMode === 'ai' ? (
                    <Wand2 className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  {generationMode === 'ai' ? 'Generate AI Art' : 'Generate Image'}
                </>
              )}
            </button>
          )}
        </div>
      </FeedbackModal>

      {/* Download Modal */}
      {generatedImageUrl && (
        <ResultImageDownload
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          imageUrl={generatedImageUrl}
          metadata={listMetadata}
        />
      )}

      {/* Image Editor */}
      {generatedImageUrl && (
        <ImageEditor
          imageUrl={generatedImageUrl}
          isOpen={isEditorOpen}
          onApply={handleEditorApply}
          onCancel={() => setIsEditorOpen(false)}
        />
      )}
    </>
  );
}
