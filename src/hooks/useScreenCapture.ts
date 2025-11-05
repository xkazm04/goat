'use client';

import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

interface CaptureOptions {
  filename?: string;
  quality?: number;
  excludeSelectors?: string[];
  width?: number;
  height?: number;
}

export const useScreenCapture = () => {
  const [isCapturing, setIsCapturing] = useState(false);

  const captureAndDownload = useCallback(async ({
    filename = 'ranking-capture.png',
    quality = 0.95,
    excludeSelectors = [],
    width,
    height
  }: CaptureOptions = {}) => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      // Hide elements that should be excluded from capture
      const elementsToHide: { element: Element; originalDisplay: string }[] = [];
      
      excludeSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const htmlElement = element as HTMLElement;
          elementsToHide.push({
            element: htmlElement,
            originalDisplay: htmlElement.style.display
          });
          htmlElement.style.display = 'none';
        });
      });

      // Wait a brief moment for DOM updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the screen
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: width || window.innerWidth,
        height: height || window.innerHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: width || window.innerWidth,
        windowHeight: height || window.innerHeight,
        ignoreElements: (element) => {
          // Additional element filtering if needed
          return element.hasAttribute('data-exclude-capture');
        }
      });

      // Restore hidden elements
      elementsToHide.forEach(({ element, originalDisplay }) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.display = originalDisplay;
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png', quality);
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      console.log(`Screenshot saved as ${filename}`);
      
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      
      // Restore hidden elements in case of error
      const elementsToRestore = document.querySelectorAll('[style*="display: none"]');
      elementsToRestore.forEach(element => {
        const htmlElement = element as HTMLElement;
        if (excludeSelectors.some(selector => htmlElement.matches(selector))) {
          htmlElement.style.display = '';
        }
      });
      
      throw error;
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  const captureElement = useCallback(async (
    elementId: string, 
    options: CaptureOptions = {}
  ) => {
    if (isCapturing) return;
    
    setIsCapturing(true);
    
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
      }

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: options.width || element.offsetWidth,
        height: options.height || element.offsetHeight
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png', options.quality || 0.95);
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = options.filename || 'element-capture.png';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Failed to capture element:', error);
      throw error;
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  return {
    captureAndDownload,
    captureElement,
    isCapturing
  };
};