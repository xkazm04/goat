'use client';

import { useState } from 'react';
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

  const generateFilename = (): string => {
    const sanitizedTitle = metadata.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const timestamp = new Date().toISOString().split('T')[0];
    return `goat-${sanitizedTitle}-${timestamp}.${selectedOption.format}`;
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(imageUrl);
      let blob = await response.blob();

      // Convert format if needed using shared utility
      if (selectedOption.format !== 'png') {
        blob = await convertImageFormat(blob, selectedOption.format, selectedOption.quality);
      }

      // Embed metadata if requested
      if (includeMetadata && selectedOption.format === 'png') {
        blob = await embedMetadata(blob, metadata);
      }

      // Download
      downloadImage(blob, generateFilename());

      setDownloaded(true);
      setTimeout(() => {
        setDownloaded(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

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
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-gray-900 rounded-xl max-w-md w-full shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
            data-testid="download-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700" data-testid="download-header">
              <h3 className="text-lg font-bold text-white">Download Options</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                data-testid="download-close-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6" data-testid="download-content">
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Image Format & Quality
                </label>
                <div className="space-y-2" data-testid="download-format-options">
                  {downloadOptions.map((option) => (
                    <button
                      key={`${option.format}-${option.quality}`}
                      onClick={() => setSelectedOption(option)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedOption === option
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                      data-testid={`download-format-${option.format}-${option.quality}-btn`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs opacity-80">{option.description}</div>
                        </div>
                        {selectedOption === option && (
                          <Check className="w-5 h-5" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metadata Option */}
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg" data-testid="download-metadata-option">
                <div>
                  <div className="text-sm font-medium text-white">Include Metadata</div>
                  <div className="text-xs text-gray-400">
                    Embed list info in image file
                  </div>
                </div>
                <button
                  onClick={() => setIncludeMetadata(!includeMetadata)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    includeMetadata ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                  data-testid="download-metadata-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      includeMetadata ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* File Info */}
              <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm" data-testid="download-file-info">
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
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700" data-testid="download-footer">
              <button
                onClick={handleDownload}
                disabled={downloading || downloaded}
                className={`w-full font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                  downloaded
                    ? 'bg-green-600 text-white'
                    : downloading
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                data-testid="download-confirm-btn"
              >
                {downloaded ? (
                  <>
                    <Check className="w-5 h-5" />
                    Downloaded!
                  </>
                ) : downloading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download Image
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
