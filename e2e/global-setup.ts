/**
 * Environment preconditions for the browser suite.
 *
 * WHY THIS EXISTS
 * ---------------
 * Several specs used to call `test.skip()` when their fixture data was absent
 * — `exploratory-smoke.spec.ts:286`, `:319`, `drag-drop-ranking.spec.ts:240`.
 * Against an empty database the suite therefore ran to completion, executed
 * essentially nothing, and reported GREEN. A run that could not do its job
 * spelled its outcome identically to a run that did it perfectly, which is the
 * exact thing a harness must never do (registry test-harness/
 * platform-quirk-absorption, and the failure-not-empty-success law).
 *
 * The precondition now belongs to a LAUNCHER instead of to each test. It is
 * checked once, before any worker starts, and a failure here aborts the run
 * with a named diagnostic rather than distributing the same discovery across
 * thirty-nine tests that each answer it by opting out.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not seed. Seeding is a separate decision with separate blast radius,
 * and a setup that silently populates a database it found empty would hide the
 * very condition this file exists to report.
 */

import type { FullConfig } from '@playwright/test';

/** How this is spelled in output, so a reader can grep for it. */
const DIAGNOSTIC = 'E2E_PRECONDITION_FAILED';

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ??
    config.projects[0]?.use?.baseURL ??
    'http://localhost:3000';

  // Opt-out for the case where someone genuinely wants to run the suite
  // against an empty database — but they have to say so, in an environment
  // variable, and the run then reports what it is.
  if (process.env.E2E_ALLOW_EMPTY_DB === '1') {
    console.warn(
      `[e2e] E2E_ALLOW_EMPTY_DB=1 — fixture precondition NOT checked. ` +
        `A green result from this run does not mean the fixtures exist.`,
    );
    return;
  }

  let payload: unknown;
  try {
    const res = await fetch(`${baseURL}/api/lists?limit=1`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      fail(
        `GET ${baseURL}/api/lists returned ${res.status}. The app is up but the ` +
          `list API is not answering; the suite cannot establish its fixtures.`,
      );
    }
    payload = await res.json();
  } catch (err) {
    if (err instanceof PreconditionError) throw err;
    fail(
      `Could not reach ${baseURL}/api/lists — ${String(
        (err as Error)?.message ?? err,
      )}. Is the dev server up and is DATABASE_URL / the Supabase config set?`,
    );
  }

  const count = countLists(payload);
  if (count === 0) {
    fail(
      `The lists API answered with ZERO lists. Every journey in this suite ` +
        `starts by clicking a list, so the run would execute nothing and then ` +
        `report success. Seed the database, or set E2E_ALLOW_EMPTY_DB=1 to ` +
        `state deliberately that you are running against an empty one.`,
    );
  }

  // A green run should say what population it walked, not just that it was
  // green (count-carries-predicate).
  console.log(`[e2e] fixture precondition OK — the lists API returned ${count} list(s).`);
}

class PreconditionError extends Error {}

function fail(message: string): never {
  throw new PreconditionError(`${DIAGNOSTIC}: ${message}`);
}

/**
 * The lists endpoint has been reshaped more than once ({ data: [...] } vs
 * { lists: [...] } vs a bare array), so this reads defensively rather than
 * pinning a shape it would then silently disagree with.
 */
function countLists(payload: unknown): number {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['data', 'lists', 'items', 'results']) {
      const value = record[key];
      if (Array.isArray(value)) return value.length;
      // { data: { lists: [...] } }
      if (value && typeof value === 'object') {
        const nested = (value as Record<string, unknown>).lists;
        if (Array.isArray(nested)) return nested.length;
      }
    }
  }
  // An unrecognised shape is NOT zero. Reporting it as zero would fail the run
  // for the wrong reason and send the next reader to the database.
  throw new PreconditionError(
    `${DIAGNOSTIC}: the lists API answered in a shape this check does not ` +
      `recognise, so the fixture precondition could not be established. ` +
      `Update countLists() in e2e/global-setup.ts. Received keys: ` +
      `${payload && typeof payload === 'object' ? Object.keys(payload).join(', ') : typeof payload}`,
  );
}

export default globalSetup;
