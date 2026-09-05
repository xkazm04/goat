import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AddressInfo } from 'node:net';

/**
 * GET /api/top/items clamps `limit` to 200. A script that asks once for 5000
 * gets 200 and — unless it pages — validates a fifth of the population under
 * a banner that says it validated everything. This test stands up a fake of
 * the route that holds 450 items in pages of 200 and runs the real scripts
 * against it.
 *
 * Negative control (recorded 2026-09-05, before the fix): analyze-images.js
 * reported "Total items: 200 (of 450)" and validate-images.js "Found 200 items
 * (total: 450)"; both assertions below were red.
 */

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const TOTAL = 450;
const CEILING = 200;
// validate-images.js loads the Sentry-wrapped next.config.js; under a full
// parallel run that exceeded vitest's 5 s default (measured 2026-09-05).
const SPAWN_TIMEOUT_MS = 60_000;

let server: Server;
let apiBase: string;
const requests: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    requests.push(req.url ?? '');
    const url = new URL(req.url ?? '/', 'http://x');
    if (url.pathname !== '/api/top/items') {
      res.writeHead(404).end('{}');
      return;
    }
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), CEILING);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const items = Array.from({ length: Math.max(0, Math.min(limit, TOTAL - offset)) }, (_, i) => ({
      id: `item-${offset + i}`,
      name: `Item ${offset + i}`,
      category: 'games',
      image_url: `https://upload.wikimedia.org/x/${offset + i}.jpg`,
    }));
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ items, total: TOTAL, limit, offset, has_more: offset + limit < TOTAL }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  apiBase = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function runScript(script: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(scriptsDir, script)], {
      env: { ...process.env, API_BASE: apiBase },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

describe('image scripts read the whole item population, not the first page', () => {
  it('analyze-images.js walks every page and reports all items', async () => {
    requests.length = 0;
    const res = await runScript('analyze-images.js');
    expect(res.code, res.stderr).toBe(0);
    expect(res.stdout).toMatch(new RegExp(`Total items:\\s+${TOTAL}\\b`));
    expect(requests.length).toBe(Math.ceil(TOTAL / CEILING));
  }, SPAWN_TIMEOUT_MS);

  it('validate-images.js walks every page and reports all items', async () => {
    requests.length = 0;
    const res = await runScript('validate-images.js');
    expect(res.code, res.stderr).toBe(0);
    expect(res.stdout).toMatch(new RegExp(`Found ${TOTAL} items`));
    expect(requests.length).toBe(Math.ceil(TOTAL / CEILING));
  }, SPAWN_TIMEOUT_MS);
});
