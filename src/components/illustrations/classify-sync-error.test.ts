import { describe, expect, it } from 'vitest';

import { classifySyncError } from './SyncErrorIllustrations';

/**
 * `classifySyncError` picks which goat the sync-status popover shows from the
 * error string `useOfflineSync` stores (`error.message`, or its own literals
 * 'Sync failed' / 'Cannot sync while offline'). It matched keywords with
 * `String.includes`, so the quota keywords `full` and `space` fired inside
 * other words: "Sync unsuccessful" and "Namespace conflict" both drew the
 * quota-exceeded goat — a picture that tells the user to free storage when the
 * remedy is to retry. Matching is now on whole words.
 *
 * Negative control (recorded 2026-09-05, before the fix): both mis-classified
 * strings in the last `it` returned 'quota' — 1 of 9 tests red, 8 green.
 */
describe('classifySyncError', () => {
  it.each([
    ['Cannot sync while offline', 'network'],
    ['Failed to fetch', 'network'],
    ['Request timeout after 30s', 'network'],
    ['Storage quota exceeded', 'quota'],
    ['Not enough space on device', 'quota'],
    ['Disk is full', 'quota'],
    ['Sync failed', 'server'],
    [null, 'server'],
  ] as const)('%s -> %s', (message, expected) => {
    expect(classifySyncError(message)).toBe(expected);
  });

  it('does not read a quota keyword out of the middle of another word', () => {
    expect(classifySyncError('Sync unsuccessful')).toBe('server');
    expect(classifySyncError('Namespace conflict on list')).toBe('server');
  });
});
