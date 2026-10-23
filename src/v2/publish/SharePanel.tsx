'use client';

import { useState } from 'react';

import { embedCode } from './oembed';

import type { Published } from './publish';

export interface ShareState {
  slug: string | null;
  visibility: 'private' | 'unlisted' | 'public';
  busy: boolean;
  error: string | null;
  onPublish: (visibility: Published) => void;
  onUnpublish: () => void;
}

/** The toolbar's Share button and its popover: publish, copy the link, copy the embed code. */
export function SharePanel({ share }: { share: ShareState }) {
  const [open, setOpen] = useState(false);
  const [embedMode, setEmbedMode] = useState<'mosaic' | 'spread'>('mosaic');
  const [copied, setCopied] = useState<string | null>(null);

  const live = share.visibility !== 'private' && share.slug !== null;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const link = live ? `${origin}/p/${share.slug}` : '';

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="share">
      <button type="button" className="ed-ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Share
      </button>
      {open ? (
        <div className="share-pop v2-glass" role="dialog" aria-label="Share this list">
          {live ? (
            <>
              <p>
                {share.visibility === 'public'
                  ? 'Public: anyone can find and open this list.'
                  : 'Unlisted: only people with the link can open this list.'}
              </p>
              <label>
                Link
                <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              </label>
              <div className="share-row">
                <button type="button" className="v2-btn" onClick={() => void copy('link', link)}>
                  {copied === 'link' ? 'Copied' : 'Copy link'}
                </button>
                <a className="ed-ghost" href={link} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
              </div>

              <label>
                Embed
                <select value={embedMode} onChange={(e) => setEmbedMode(e.target.value === 'spread' ? 'spread' : 'mosaic')}>
                  <option value="mosaic">Mosaic</option>
                  <option value="spread">Spread</option>
                </select>
              </label>
              <textarea readOnly rows={3} value={embedCode(origin, share.slug!, embedMode)} onFocus={(e) => e.currentTarget.select()} />
              <button
                type="button"
                className="v2-btn"
                onClick={() => void copy('embed', embedCode(origin, share.slug!, embedMode))}
              >
                {copied === 'embed' ? 'Copied' : 'Copy embed code'}
              </button>

              <div className="share-row">
                {share.visibility === 'unlisted' ? (
                  <button type="button" className="ed-ghost" disabled={share.busy} onClick={() => share.onPublish('public')}>
                    Make public
                  </button>
                ) : (
                  <button type="button" className="ed-ghost" disabled={share.busy} onClick={() => share.onPublish('unlisted')}>
                    Make unlisted
                  </button>
                )}
                <button type="button" className="ed-ghost" disabled={share.busy} onClick={share.onUnpublish}>
                  Unpublish
                </button>
              </div>
            </>
          ) : (
            <>
              <p>Publish this list to get a link and an embed. You can take it back to private at any time.</p>
              <div className="share-row">
                <button type="button" className="v2-btn" disabled={share.busy} onClick={() => share.onPublish('unlisted')}>
                  {share.busy ? 'Publishing…' : 'Publish with a link'}
                </button>
                <button type="button" className="ed-ghost" disabled={share.busy} onClick={() => share.onPublish('public')}>
                  Publish publicly
                </button>
              </div>
            </>
          )}
          {share.error ? <p role="alert">{share.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
