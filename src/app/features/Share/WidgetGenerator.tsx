'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  WidgetConfig,
  WidgetSize,
  WidgetTheme,
  WidgetDisplayStyle,
  EmbedFormat,
  WIDGET_DIMENSIONS,
  DEFAULT_WIDGET_CONFIG,
  EmbedCodeGenerator,
  ThemeCustomizer,
} from '@/lib/embed';

interface WidgetGeneratorProps {
  listId: string;
  listTitle?: string;
  onClose?: () => void;
}

/**
 * Size option configuration
 */
const SIZE_OPTIONS: { value: WidgetSize; label: string; description: string }[] = [
  { value: 'compact', label: 'Compact', description: '320 x 200px' },
  { value: 'standard', label: 'Standard', description: '400 x 400px' },
  { value: 'full', label: 'Full', description: '600 x 600px' },
];

/**
 * Theme option configuration
 */
const THEME_OPTIONS: { value: WidgetTheme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'auto', label: 'Auto (System)' },
];

/**
 * Display style options
 */
const DISPLAY_OPTIONS: { value: WidgetDisplayStyle; label: string }[] = [
  { value: 'list', label: 'List' },
  { value: 'grid', label: 'Grid' },
  { value: 'podium', label: 'Podium' },
  { value: 'minimal', label: 'Minimal' },
];

/**
 * Embed format options
 */
const FORMAT_OPTIONS: { value: EmbedFormat; label: string; description: string }[] = [
  { value: 'iframe', label: 'iFrame', description: 'Standard HTML embed' },
  { value: 'script', label: 'JavaScript', description: 'Dynamic embed with script' },
  { value: 'oembed', label: 'oEmbed', description: 'Auto-discovery URL' },
];

/**
 * WidgetGenerator Component
 * UI for generating and customizing embeddable widgets
 */
export function WidgetGenerator({ listId, listTitle, onClose }: WidgetGeneratorProps) {
  const [config, setConfig] = useState<WidgetConfig>({
    listId,
    ...DEFAULT_WIDGET_CONFIG,
  });

  const [selectedFormat, setSelectedFormat] = useState<EmbedFormat>('iframe');
  const [copied, setCopied] = useState(false);

  // Create embed code generator
  const generator = useMemo(
    () => new EmbedCodeGenerator(listId, config),
    [listId, config]
  );

  // Generate embed code based on selected format
  const embedCode = useMemo(
    () => generator.generate(selectedFormat),
    [generator, selectedFormat]
  );

  // Get preview URL
  const previewUrl = useMemo(() => generator.getWidgetUrl(), [generator]);

  // Update config handler
  const updateConfig = useCallback((updates: Partial<WidgetConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [embedCode.code]);

  const dimensions = WIDGET_DIMENSIONS[config.size];

  return (
    <div className="widget-generator">
      <div className="widget-generator-header">
        <h2 className="widget-generator-title">Embed Widget</h2>
        {listTitle && (
          <p className="widget-generator-subtitle">{listTitle}</p>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="widget-generator-close"
            aria-label="Close"
          >
            &times;
          </button>
        )}
      </div>

      <div className="widget-generator-content">
        {/* Preview Section */}
        <div className="widget-generator-preview">
          <h3 className="section-title">Preview</h3>
          <div
            className="preview-container"
            style={{
              width: Math.min(dimensions.width, 400),
              height: Math.min(dimensions.height, 300),
            }}
          >
            <iframe
              src={previewUrl}
              width="100%"
              height="100%"
              style={{
                border: 'none',
                borderRadius: `${config.borderRadius}px`,
              }}
              title="Widget Preview"
            />
          </div>
        </div>

        {/* Settings Section */}
        <div className="widget-generator-settings">
          <h3 className="section-title">Customize</h3>

          {/* Size */}
          <div className="setting-group">
            <label className="setting-label">Size</label>
            <div className="setting-options">
              {SIZE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  className={`setting-option ${config.size === option.value ? 'active' : ''}`}
                  onClick={() => updateConfig({ size: option.value })}
                >
                  <span className="option-label">{option.label}</span>
                  <span className="option-desc">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="setting-group">
            <label className="setting-label">Theme</label>
            <div className="setting-options horizontal">
              {THEME_OPTIONS.map(option => (
                <button
                  key={option.value}
                  className={`setting-option ${config.theme === option.value ? 'active' : ''}`}
                  onClick={() => updateConfig({ theme: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display Style */}
          <div className="setting-group">
            <label className="setting-label">Display Style</label>
            <div className="setting-options horizontal">
              {DISPLAY_OPTIONS.map(option => (
                <button
                  key={option.value}
                  className={`setting-option ${config.displayStyle === option.value ? 'active' : ''}`}
                  onClick={() => updateConfig({ displayStyle: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Item Count */}
          <div className="setting-group">
            <label className="setting-label">Items to Show</label>
            <input
              type="range"
              min="1"
              max="20"
              value={config.itemCount}
              onChange={(e) => updateConfig({ itemCount: parseInt(e.target.value, 10) })}
              className="setting-slider"
            />
            <span className="setting-value">{config.itemCount}</span>
          </div>

          {/* Toggle Options */}
          <div className="setting-group toggles">
            <label className="toggle-option">
              <input
                type="checkbox"
                checked={config.showRanks}
                onChange={(e) => updateConfig({ showRanks: e.target.checked })}
              />
              <span>Show Rank Numbers</span>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={config.showImages}
                onChange={(e) => updateConfig({ showImages: e.target.checked })}
              />
              <span>Show Images</span>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={config.showTitle}
                onChange={(e) => updateConfig({ showTitle: e.target.checked })}
              />
              <span>Show Title</span>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={config.interactive}
                onChange={(e) => updateConfig({ interactive: e.target.checked })}
              />
              <span>Interactive (Clickable)</span>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={config.showBranding}
                onChange={(e) => updateConfig({ showBranding: e.target.checked })}
              />
              <span>Show GOAT Branding</span>
            </label>
          </div>
        </div>

        {/* Embed Code Section */}
        <div className="widget-generator-code">
          <h3 className="section-title">Embed Code</h3>

          {/* Format Selection */}
          <div className="format-tabs">
            {FORMAT_OPTIONS.map(option => (
              <button
                key={option.value}
                className={`format-tab ${selectedFormat === option.value ? 'active' : ''}`}
                onClick={() => setSelectedFormat(option.value)}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Code Display */}
          <div className="code-container">
            <pre className="code-block">
              <code>{embedCode.code}</code>
            </pre>
            <button
              className={`copy-button ${copied ? 'copied' : ''}`}
              onClick={copyToClipboard}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Additional Formats */}
          <details className="additional-formats">
            <summary>More embed options</summary>
            <div className="formats-list">
              {generator.getAdditionalFormats().map((format, index) => (
                <div key={index} className="format-item">
                  <span className="format-name">{format.name}</span>
                  <code className="format-code">{format.code}</code>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      <style jsx>{`
        .widget-generator {
          background: var(--widget-bg, #1a1a2e);
          border-radius: 12px;
          overflow: hidden;
          max-width: 800px;
          width: 100%;
        }

        .widget-generator-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--widget-border, #2d4059);
          position: relative;
        }

        .widget-generator-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: var(--widget-text, #ffffff);
        }

        .widget-generator-subtitle {
          font-size: 14px;
          color: var(--widget-text-secondary, #a0a0a0);
          margin: 4px 0 0;
        }

        .widget-generator-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          color: var(--widget-text-secondary, #a0a0a0);
          cursor: pointer;
          padding: 4px 8px;
        }

        .widget-generator-close:hover {
          color: var(--widget-text, #ffffff);
        }

        .widget-generator-content {
          padding: 24px;
          display: grid;
          gap: 24px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--widget-text, #ffffff);
          margin: 0 0 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .widget-generator-preview {
          background: var(--widget-surface, #16213e);
          padding: 16px;
          border-radius: 8px;
        }

        .preview-container {
          margin: 0 auto;
          overflow: hidden;
          border-radius: 8px;
        }

        .setting-group {
          margin-bottom: 16px;
        }

        .setting-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--widget-text-secondary, #a0a0a0);
          margin-bottom: 8px;
        }

        .setting-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .setting-options.horizontal {
          flex-direction: row;
          flex-wrap: wrap;
        }

        .setting-option {
          padding: 10px 16px;
          background: var(--widget-surface, #16213e);
          border: 1px solid var(--widget-border, #2d4059);
          border-radius: 6px;
          color: var(--widget-text, #ffffff);
          cursor: pointer;
          text-align: left;
          transition: all 0.15s ease;
        }

        .setting-option:hover {
          background: var(--widget-border, #2d4059);
        }

        .setting-option.active {
          border-color: var(--widget-accent, #e94560);
          background: rgba(233, 69, 96, 0.1);
        }

        .option-label {
          font-weight: 500;
        }

        .option-desc {
          display: block;
          font-size: 11px;
          color: var(--widget-text-secondary, #a0a0a0);
          margin-top: 2px;
        }

        .setting-slider {
          width: 100%;
          margin-right: 12px;
        }

        .setting-value {
          min-width: 30px;
          text-align: center;
          color: var(--widget-accent, #e94560);
          font-weight: 600;
        }

        .toggles {
          display: grid;
          gap: 8px;
        }

        .toggle-option {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--widget-text, #ffffff);
          cursor: pointer;
        }

        .toggle-option input {
          accent-color: var(--widget-accent, #e94560);
        }

        .format-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 12px;
        }

        .format-tab {
          padding: 8px 16px;
          background: var(--widget-surface, #16213e);
          border: 1px solid var(--widget-border, #2d4059);
          border-radius: 6px;
          color: var(--widget-text-secondary, #a0a0a0);
          cursor: pointer;
          font-size: 13px;
          transition: all 0.15s ease;
        }

        .format-tab:hover {
          color: var(--widget-text, #ffffff);
        }

        .format-tab.active {
          background: var(--widget-accent, #e94560);
          border-color: var(--widget-accent, #e94560);
          color: #ffffff;
        }

        .code-container {
          position: relative;
        }

        .code-block {
          background: var(--widget-surface, #16213e);
          border: 1px solid var(--widget-border, #2d4059);
          border-radius: 8px;
          padding: 16px;
          overflow-x: auto;
          font-size: 12px;
          line-height: 1.5;
          margin: 0;
        }

        .code-block code {
          color: var(--widget-text, #ffffff);
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .copy-button {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 6px 12px;
          background: var(--widget-accent, #e94560);
          border: none;
          border-radius: 4px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .copy-button:hover {
          filter: brightness(1.1);
        }

        .copy-button.copied {
          background: #2ec4b6;
        }

        .additional-formats {
          margin-top: 16px;
        }

        .additional-formats summary {
          color: var(--widget-text-secondary, #a0a0a0);
          cursor: pointer;
          font-size: 13px;
        }

        .additional-formats summary:hover {
          color: var(--widget-text, #ffffff);
        }

        .formats-list {
          margin-top: 12px;
          display: grid;
          gap: 12px;
        }

        .format-item {
          background: var(--widget-surface, #16213e);
          padding: 12px;
          border-radius: 6px;
        }

        .format-name {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--widget-text-secondary, #a0a0a0);
          margin-bottom: 6px;
        }

        .format-code {
          display: block;
          font-size: 11px;
          color: var(--widget-text, #ffffff);
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          word-break: break-all;
        }

        @media (min-width: 640px) {
          .widget-generator-content {
            grid-template-columns: 1fr 1fr;
          }

          .widget-generator-code {
            grid-column: span 2;
          }
        }
      `}</style>
    </div>
  );
}

export default WidgetGenerator;
