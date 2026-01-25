'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  WidgetConfig,
  WidgetData,
  WidgetMessage,
  WIDGET_DIMENSIONS,
  generateWidgetUrl,
} from '@/lib/embed';

interface WidgetPreviewProps {
  config: WidgetConfig;
  className?: string;
  onReady?: () => void;
  onInteraction?: (itemRank: number, itemTitle: string) => void;
}

/**
 * WidgetPreview Component
 * Renders a live preview of the embeddable widget
 */
export function WidgetPreview({
  config,
  className = '',
  onReady,
  onInteraction,
}: WidgetPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get widget URL
  const widgetUrl = generateWidgetUrl(config);
  const dimensions = WIDGET_DIMENSIONS[config.size];

  // Handle messages from widget iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent<WidgetMessage>) => {
      // Only accept messages from our widget
      if (event.origin !== window.location.origin) {
        return;
      }

      const message = event.data;

      if (message.type === 'ready') {
        setIsLoading(false);
        setError(null);
        onReady?.();
      } else if (message.type === 'click' && onInteraction) {
        onInteraction(message.itemRank, message.itemTitle);
      } else if (message.type === 'resize' && iframeRef.current) {
        // Auto-resize iframe if needed
        iframeRef.current.style.height = `${message.height}px`;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onReady, onInteraction]);

  // Handle iframe load
  const handleLoad = () => {
    // Widget will send 'ready' message when fully loaded
    // Set a timeout as fallback
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  };

  // Handle iframe error
  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load widget preview');
  };

  return (
    <div
      className={`widget-preview ${className}`}
      style={{
        width: dimensions.width,
        maxWidth: '100%',
        height: dimensions.height,
        position: 'relative',
        borderRadius: `${config.borderRadius || 12}px`,
        overflow: 'hidden',
        background: '#16213e',
      }}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="widget-preview-loading">
          <div className="loading-spinner" />
          <span>Loading preview...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="widget-preview-error">
          <span>{error}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* Widget iframe */}
      <iframe
        ref={iframeRef}
        src={widgetUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
        style={{
          border: 'none',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
        title="Widget Preview"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />

      <style jsx>{`
        .widget-preview-loading,
        .widget-preview-error {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #a0a0a0;
          font-size: 14px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #2d4059;
          border-top-color: #e94560;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .widget-preview-error button {
          padding: 6px 16px;
          background: #e94560;
          border: none;
          border-radius: 4px;
          color: white;
          font-size: 12px;
          cursor: pointer;
        }

        .widget-preview-error button:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}

/**
 * Widget Preview with comparison (showing multiple sizes/themes)
 */
interface WidgetPreviewGridProps {
  listId: string;
  baseConfig?: Partial<WidgetConfig>;
}

export function WidgetPreviewGrid({ listId, baseConfig = {} }: WidgetPreviewGridProps) {
  const sizes = ['compact', 'standard', 'full'] as const;

  return (
    <div className="widget-preview-grid">
      <h3>Widget Size Comparison</h3>
      <div className="preview-grid">
        {sizes.map(size => (
          <div key={size} className="preview-item">
            <span className="preview-label">{size}</span>
            <WidgetPreview
              config={{
                listId,
                ...baseConfig,
                size,
                theme: baseConfig.theme || 'dark',
                displayStyle: baseConfig.displayStyle || 'list',
                itemCount: baseConfig.itemCount || 5,
                showRanks: baseConfig.showRanks ?? true,
                showImages: baseConfig.showImages ?? true,
                showTitle: baseConfig.showTitle ?? true,
                showBranding: baseConfig.showBranding ?? true,
                interactive: baseConfig.interactive ?? true,
              }}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .widget-preview-grid {
          padding: 20px;
        }

        .widget-preview-grid h3 {
          margin: 0 0 16px;
          color: #ffffff;
          font-size: 16px;
        }

        .preview-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
        }

        .preview-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preview-label {
          font-size: 12px;
          font-weight: 500;
          color: #a0a0a0;
          text-transform: capitalize;
        }
      `}</style>
    </div>
  );
}

export default WidgetPreview;
