import { describe, expect, it } from 'vitest';

import { cliArgs, extractJsonObject, parseCliLine } from './cli';

describe('claude CLI engine', () => {
  it('runs one plain completion: no tools, no settings, replaced system prompt, low effort', () => {
    const args = cliArgs('SYS', 'haiku', 'low');
    const at = (flag: string) => args[args.indexOf(flag) + 1];
    expect(at('--model')).toBe('haiku');
    expect(at('--effort')).toBe('low');
    expect(at('--tools')).toBe('');
    expect(at('--setting-sources')).toBe('');
    expect(at('--system-prompt')).toBe('SYS');
    expect(args).toContain('--no-session-persistence');
    expect(args).not.toContain('--dangerously-skip-permissions');
  });

  it('turns stream-json lines into text deltas and one result with usage', () => {
    const delta = JSON.stringify({
      type: 'stream_event',
      event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hi' } },
    });
    expect(parseCliLine(delta)).toEqual({ type: 'delta', text: 'hi' });

    const result = JSON.stringify({
      type: 'result',
      is_error: false,
      result: 'hi there',
      usage: { input_tokens: 2, cache_creation_input_tokens: 10, cache_read_input_tokens: 5, output_tokens: 4 },
    });
    expect(parseCliLine(result)).toEqual({
      type: 'result',
      text: 'hi there',
      isError: false,
      usage: { inputTokens: 12, outputTokens: 4, cacheReadTokens: 5 },
    });
  });

  it('ignores other event kinds and non-JSON lines', () => {
    expect(parseCliLine('not json')).toBeNull();
    expect(parseCliLine(JSON.stringify({ type: 'system', subtype: 'init' }))).toBeNull();
    expect(parseCliLine(JSON.stringify({ type: 'stream_event', event: { type: 'message_start' } }))).toBeNull();
  });

  it('pulls the first JSON object out of prose or a code fence, braces in strings included', () => {
    expect(extractJsonObject('Sure!\n```json\n{"a": {"b": "}"}, "c": 1}\n```')).toEqual({ a: { b: '}' }, c: 1 });
    expect(extractJsonObject('no json here')).toBeNull();
    expect(extractJsonObject('{"cut": ')).toBeNull();
  });
});
