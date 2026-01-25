/**
 * Email Platform Adapter
 */

import { BasePlatformAdapter } from './base';
import type {
  ShareContent,
  OptimizedContent,
  PlatformConfig,
  PlatformCapabilities,
} from '../types';

/**
 * Email sharing adapter
 */
export class EmailAdapter extends BasePlatformAdapter {
  readonly config: PlatformConfig = {
    platform: 'email',
    displayName: 'Email',
    icon: 'mail',
    color: '#6B7280',
    maxTextLength: 50000, // No real limit
    maxHashtags: 0,
    supportedImageFormats: [],
    imageDimensions: { width: 600, height: 400 },
    supportsDirectShare: true,
    requiresAuth: false,
    urlScheme: 'mailto:',
    webUrl: 'mailto:',
  };

  readonly capabilities: PlatformCapabilities = {
    text: true,
    url: true,
    image: false, // Not via mailto
    video: false,
    files: false,
    richPreview: false,
    hashtags: false,
    mentions: false,
  };

  optimizeContent(content: ShareContent, trackedUrl: string): OptimizedContent {
    // Build email subject
    let subject: string;
    if (content.type === 'challenge') {
      subject = `Challenge: ${content.title}`;
    } else if (content.type === 'ranking' || content.type === 'result') {
      subject = `Check out my ${content.title}`;
    } else {
      subject = content.title;
    }

    // Build email body
    const bodyParts: string[] = [];

    if (content.type === 'challenge') {
      bodyParts.push(`I've created a ranking challenge: ${content.title}`);
      bodyParts.push('');
      bodyParts.push(content.description || 'Can you beat my ranking?');
    } else if (content.type === 'ranking') {
      bodyParts.push(`I wanted to share my ${content.title} with you.`);
      if (content.description) {
        bodyParts.push('');
        bodyParts.push(content.description);
      }
    } else {
      bodyParts.push(content.description || `Check out: ${content.title}`);
    }

    bodyParts.push('');
    bodyParts.push(`View it here: ${trackedUrl}`);
    bodyParts.push('');
    bodyParts.push('---');
    bodyParts.push('Shared via G.O.A.T.');

    const body = bodyParts.join('\n');

    return {
      ...content,
      title: subject,
      text: body,
      formattedHashtags: '',
      trackedUrl,
      optimizedImageUrl: undefined,
      characterCount: body.length,
      fitsLimits: true,
    };
  }

  buildShareUrl(content: OptimizedContent): string {
    const params = new URLSearchParams();
    params.append('subject', content.title);
    params.append('body', content.text);

    // Use mailto: with query params
    return `mailto:?${params.toString()}`;
  }

  protected openShareWindow(url: string): void {
    // For email, we just navigate to the mailto link
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }
}

export const emailAdapter = new EmailAdapter();
