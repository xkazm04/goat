import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline';

import type { Usage } from './converse';

/**
 * Claude Code CLI as an LLM engine, for local tests without an API key
 * (V2_AI_PROVIDER=cli). It runs `claude -p` in a scratch directory with every
 * tool and setting source off, a replaced system prompt and low effort, so a
 * call is one plain completion. Development only: the providers refuse to
 * build when NODE_ENV is production.
 */

const CLI_MODEL = process.env.V2_CLI_MODEL?.trim() || 'haiku';
const CLI_EFFORT = process.env.V2_CLI_EFFORT?.trim() || 'low';

export type CliEvent =
  | { type: 'delta'; text: string }
  | { type: 'result'; text: string; usage: Usage; isError: boolean };

export function cliArgs(system: string, model: string = CLI_MODEL, effort: string = CLI_EFFORT): string[] {
  return [
    '-p',
    '--model',
    model,
    '--effort',
    effort,
    '--no-session-persistence',
    '--tools',
    '',
    '--disable-slash-commands',
    '--setting-sources',
    '',
    '--system-prompt',
    system,
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
  ];
}

interface RawLine {
  type?: string;
  event?: { type?: string; delta?: { type?: string; text?: string } };
  result?: string;
  is_error?: boolean;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
}

/** One stream-json line to an event, or null for lines this engine ignores. */
export function parseCliLine(line: string): CliEvent | null {
  let raw: RawLine;
  try {
    raw = JSON.parse(line) as RawLine;
  } catch {
    return null;
  }
  if (raw.type === 'stream_event') {
    const d = raw.event?.delta;
    if (raw.event?.type === 'content_block_delta' && d?.type === 'text_delta' && typeof d.text === 'string') {
      return { type: 'delta', text: d.text };
    }
    return null;
  }
  if (raw.type === 'result') {
    const u = raw.usage ?? {};
    return {
      type: 'result',
      text: typeof raw.result === 'string' ? raw.result : '',
      isError: raw.is_error === true,
      usage: {
        inputTokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
        outputTokens: u.output_tokens ?? 0,
        cacheReadTokens: u.cache_read_input_tokens ?? 0,
      },
    };
  }
  return null;
}

/** Run one completion. Yields text deltas as they arrive and one final result. */
export async function* runCli(input: {
  system: string;
  prompt: string;
  signal?: AbortSignal;
  model?: string;
  effort?: string;
}): AsyncGenerator<CliEvent> {
  if (process.env.NODE_ENV === 'production') throw new Error('The CLI engine is for local development only.');

  const child = spawn(process.env.V2_CLAUDE_BIN?.trim() || 'claude', cliArgs(input.system, input.model, input.effort), {
    cwd: tmpdir(),
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const stop = () => child.kill();
  input.signal?.addEventListener('abort', stop, { once: true });

  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr = (stderr + chunk).slice(-2000);
  });
  const spawnFailed = new Promise<never>((_, reject) => child.once('error', reject));
  spawnFailed.catch(() => undefined);

  child.stdin.end(input.prompt);

  let sawResult = false;
  try {
    const lines = createInterface({ input: child.stdout });
    for await (const line of lines) {
      const event = parseCliLine(line);
      if (!event) continue;
      if (event.type === 'result') sawResult = true;
      yield event;
    }
    if (!sawResult) throw new Error(`claude CLI produced no result${stderr ? `: ${stderr.trim()}` : ''}`);
  } finally {
    input.signal?.removeEventListener('abort', stop);
    if (child.exitCode === null) child.kill();
  }
}

/** Run to completion and return the final text and usage. */
export async function completeCli(input: Parameters<typeof runCli>[0]): Promise<{ text: string; usage: Usage }> {
  let text = '';
  let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
  for await (const event of runCli(input)) {
    if (event.type === 'result') {
      if (event.isError) throw new Error(`claude CLI error: ${event.text}`);
      text = event.text;
      usage = event.usage;
    }
  }
  return { text, usage };
}

/** The first balanced JSON object in text, tolerant of prose or a code fence around it. */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}
