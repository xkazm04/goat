'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Check } from 'lucide-react';
import { downloadImage } from '../lib/socialShareIntegration';
import type { ResultImageDownloadProps, ResultImageDownloadMetadata } from '@/types/modal-props';
import { isResultImageDownloadOpen } from '@/types/modal-props';
import {
  convertImageFormat,
  estimateImageSize,
  formatFileSize,
  type ImageFormat,
  type ImageQuality,
} from '@/lib/image-utils';
import { SuccessCelebration, DownloadProgress } from '@/components/ui/SuccessCelebration';
import {
  cardEntranceVariants,
  smoothTransition,
  prefersReducedMotion,
  DURATION,
  EASING,
} from '@/lib/animations/sharing';

// Re-export type for external use
export type { ResultImageDownloadMetadata };

interface DownloadOption {
  format: ImageFormat;
  quality: ImageQuality;
  label: string;
  description: string;
}

const downloadOptions: DownloadOption[] = [
  {
    format: 'png',
    quality: 'standard',
    label: 'PNG - Standard',
    description: 'Good quality, smaller file size',
  },
  {
    format: 'png',
    quality: 'high',
    label: 'PNG - High Quality',
    description: 'Best for web sharing',
  },
  {
    format: 'jpg',
    quality: 'high',
    label: 'JPG - High Quality',
    description: 'Compressed, smaller file',
  },
  {
    format: 'webp',
    quality: 'high',
    label: 'WebP - Modern',
    description: 'Modern format, best compression',
  },
];

/**
 * Result Image Download Modal
 *
 * Uses discriminated union props: when isOpen=true, imageUrl and metadata are required
 */
export function ResultImageDownload(props: ResultImageDownloadProps) {
  const { isOpen, onClose } = props;

  // Use type guard to safely access required props when modal is open
  const isOpenState = isResultImageDownloadOpen(props);
  const imageUrl = isOpenState ? props.imageUrl : '';
  const metadata = isOpenState ? props.metadata : {
    title: '',
    category: '',
    size: 0,
  };
  const [selectedOption, setSelectedOption] = useState<DownloadOption>(downloadOptions[1]);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const reducedMotion = prefersReducedMotion();

  const generateFilename = (): string => {
    const sanitizedTitle = metadata.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const timestamp = new Date().toISOString().split('T')[0];
    return `goat-${sanitizedTitle}-${timestamp}.${selectedOption.format}`;
  };

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => Math.min(prev + 0.1, 0.9));
      }, 100);

      // Convert data URL to blob
      const response = await fetch(imageUrl);
      let blob = await response.blob();
      setDownloadProgress(0.5);

      // Convert format if needed using shared utility
      if (selectedOption.format !== 'png') {
        blob = await convertImageFormat(blob, selectedOption.format, selectedOption.quality);
      }
      setDownloadProgress(0.7);

      // Embed metadata if requested
      if (includeMetadata && selectedOption.format === 'png') {
        blob = await embedMetadata(blob, metadata);
      }
      setDownloadProgress(0.9);

      // Download
      downloadImage(blob, generateFilename());

      clearInterval(progressInterval);
      setDownloadProgress(1);
      setDownloaded(true);
      setShowCelebration(true);

      setTimeout(() => {
        setDownloaded(false);
        setShowCelebration(false);
        setDownloadProgress(0);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image. Please try again.');
      setDownloadProgress(0);
    } finally {
      setDownloading(false);
    }
  }, [imageUrl, selectedOption, includeMetadata, metadata, onClose]);

  const embedMetadata = async (blob: Blob, meta: ResultImageDownloadMetadata): Promise<Blob> => {
    // For PNG format, we could embed metadata in tEXt chunks
    // This is a simplified version - for production, use a library like pngjs
    // For now, we'll just return the blob as-is
    console.log('Embedding metadata:', meta);
    return blob;
  };

  const getEstimatedSize = (): string => {
    const baseSize = 500; // KB
    const sizeKB = estimateImageSize(baseSize, selectedOption.format, selectedOption.quality);
    return formatFileSize(sizeKB);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={smoothTransition}
          className="fixed inset-0 bg-black/60 backdrop-blur-xl z-60 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            variants={cardEntranceVariants}
            initial={reducedMotion ? false : "hidden"}
            animate="visible"
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={smoothTransition}
            className="bg-gray-900 rounded-xl max-w-md w-full shadow-2xl shadow-black/50 border border-gray-700/80 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            data-testid="download-modal"
          >
            {/* Success celebration overlay */}
            <SuccessCelebration
              show={showCelebration}
              variant="download"
              color="#06b6d4"
              size="lg"
            />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700" data-testid="download-header">
              <motion.h3
                className="text-lg font-bold text-white"
                initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                Download Options
              </motion.h3>
              <motion.button
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200 p-1.5 rounded-lg
                  focus-ring active:scale-95"
                aria-label="Close download dialog"
                data-testid="download-close-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6" data-testid="download-content">
              {/* Format Selection */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Image Format & Quality
                </label>
                <div className="space-y-2" data-testid="download-format-options">
                  {downloadOptions.map((option, index) => (
                    <motion.button
                      key={`${option.format}-${option.quality}`}
                      onClick={() => setSelectedOption(option)}
                      aria-pressed={selectedOption === option}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200
                        focus-ring
                        ${
                        selectedOption === option
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700/80 hover:shadow-md'
                      }`}
                      initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      whileHover={{ scale: selectedOption === option ? 1 : 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      data-testid={`download-format-${option.format}-${option.quality}-btn`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs opacity-80">{option.description}</div>
                        </div>
                        <AnimatePresence mode="wait">
                          {selectedOption === option && (
                            <motion.div
                              initial={{ scale: 0, rotate: -90 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 90 }}
                              transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 15,
                              }}
                            >
                              <Check className="w-5 h-5" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Metadata Option */}
              <motion.div
                className="flex items-center justify-between p-3 bg-gray-800/80 rounded-lg border border-gray-700/50"
                data-testid="download-metadata-option"
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div>
                  <div className="text-sm font-medium text-white">Include Metadata</div>
                  <div className="text-xs text-gray-400">
                    Embed list info in image file
                  </div>
                </div>
                <motion.button
                  onClick={() => setIncludeMetadata(!includeMetadata)}
                  role="switch"
                  aria-checked={includeMetadata}
                  aria-label="Include metadata in image"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200
                    focus-ring
                    ${includeMetadata ? 'bg-blue-600 shadow-md shadow-blue-500/30' : 'bg-gray-600 hover:bg-gray-500'}`}
                  data-testid="download-metadata-toggle"
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.span
                    className="inline-block h-4 w-4 rounded-full bg-white shadow-xs"
                    animate={{
                      x: includeMetadata ? 24 : 4,
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                </motion.button>
              </motion.div>

              {/* File Info */}
              <motion.div
                className="bg-gray-800/80 rounded-lg p-4 space-y-2.5 text-sm border border-gray-700/50"
                data-testid="download-file-info"
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <div className="flex justify-between text-gray-300">
                  <span>Filename:</span>
                  <span className="font-mono text-xs" data-testid="download-filename">{generateFilename()}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Estimated Size:</span>
                  <span className="font-semibold" data-testid="download-estimated-size">{getEstimatedSize()}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Dimensions:</span>
                  <span data-testid="download-dimensions">1200 × 630 px</span>
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <motion.div
              className="p-6 border-t border-gray-700"
              data-testid="download-footer"
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                onClick={handleDownload}
                disabled={downloading || downloaded}
                className={`w-full font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors relative overflow-hidden ${
                  downloaded
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
                    : downloading
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
                whileHover={!downloading && !downloaded ? { scale: 1.02, boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)' } : {}}
                whileTap={!downloading && !downloaded ? { scale: 0.98 } : {}}
                data-testid="download-confirm-btn"
              >
                {/* Progress bar overlay */}
                {downloading && (
                  <motion.div
                    className="absolute inset-0 bg-blue-600/50"
                    style={{ originX: 0 }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: downloadProgress }}
                    transition={{ duration: DURATION.fast, ease: EASING.easeOut }}
                  />
                )}

                <span className="relative z-10 flex items-center gap-2">
                  {downloaded ? (
                    <>
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 15,
                        }}
                      >
                        <Check className="w-5 h-5" />
                      </motion.div>
                      Downloaded!
                    </>
                  ) : downloading ? (
                    <>
                      <DownloadProgress
                        progress={downloadProgress}
                        size="sm"
                        color="#ffffff"
                      />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download Image
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
