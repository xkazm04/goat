import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { enrichmentSourceSchema } from './studio';

/**
 * `enrichmentSourceSchema` in studio.ts carries the comment "matches the
 * server's EnrichmentSource type". Nothing checked that claim until this file.
 *
 * The server declares its OWN literal union, locally, in
 * src/app/api/studio/generate/route.ts — so one vocabulary has two
 * hand-maintained copies on two sides of an HTTP boundary. That is the shape
 * the registry's ipc-contract golden path calls a race with a delay fuse
 * (one-authority-per-vocabulary): both compilers stay green, both test suites
 * stay green, and the disagreement surfaces at runtime the first time the
 * server emits a member the client's zod schema does not accept — at which
 * point `enrichedItemSchema.parse` rejects an otherwise valid generate
 * response.
 *
 * Generating one side from the other is the technique this SHOULD use, but the
 * server type is a local `type` alias inside a route module and moving it is a
 * cross-context change. The reachable rung is the ipc-contract path's other
 * technique — a drift gate: read the producer's union from disk and require
 * set-equality with the consumer's schema. A member added on either side alone
 * reddens this test.
 *
 * The source is comment-stripped before matching (a matcher over raw text is
 * satisfied by a file that only TALKS about the rule).
 *
 * Negative control, recorded 2026-09-05: appending ` | 'seeded_drift'` to the
 * route's union turned this red with
 *   server-only members: seeded_drift
 * and removing it turned it green again.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const ROUTE = path.join(here, '..', 'app', 'api', 'studio', 'generate', 'route.ts');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** The server's own `type EnrichmentSource = 'a' | 'b' | ...` union, read from disk. */
function serverEnrichmentSources(): string[] {
  const src = stripComments(readFileSync(ROUTE, 'utf8'));
  const decl = /\btype\s+EnrichmentSource\s*=\s*([^;]+);/.exec(src);
  if (!decl) {
    throw new Error(
      `${ROUTE}: no \`type EnrichmentSource = ...;\` declaration found. If the ` +
        'server type moved or was renamed, this gate must be repointed, not deleted.'
    );
  }
  const members = Array.from(decl[1].matchAll(/'([^']+)'/g), (m) => m[1]);
  if (members.length === 0) {
    throw new Error(`${ROUTE}: EnrichmentSource declaration held no string literals`);
  }
  return members.sort();
}

describe('studio EnrichmentSource — client schema and server union are one vocabulary', () => {
  it('the client zod enum and the server literal union hold the same members', () => {
    const client = [...enrichmentSourceSchema.options].sort();
    const server = serverEnrichmentSources();

    const clientOnly = client.filter((m) => !server.includes(m));
    const serverOnly = server.filter((m) => !client.includes(m as never));

    expect(
      { clientOnly, serverOnly },
      'enrichment_source drifted between src/types/studio.ts and ' +
        'src/app/api/studio/generate/route.ts — update BOTH, they are one contract'
    ).toEqual({ clientOnly: [], serverOnly: [] });
  });

  it('enrichedItemSchema accepts every member the server can actually emit', () => {
    for (const source of serverEnrichmentSources()) {
      const parsed = enrichmentSourceSchema.safeParse(source);
      expect(parsed.success, `server may emit "${source}" but the client schema rejects it`).toBe(
        true
      );
    }
  });
});
