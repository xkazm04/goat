'use client';

import { useRef, useState } from 'react';

import { streamCritic } from '@/v2/ai/client';
import type { ChatTurn } from '@/v2/ai/critic';
import { describeChange, snapshotOf, type ListSnapshot } from '@/v2/ai/snapshot';

import { useEditor } from './context';


interface Line {
  role: 'user' | 'critic';
  text: string;
}

/**
 * "Challenge me": a chat with a critic who argues with the ranking. The list
 * as it was at the first question is sent unchanged every time (so the
 * server's cached prefix holds); edits since the last question are sent as a
 * short diff instead (docs/v2/TECHNICAL_PACKAGE.md §4).
 */
export function Critic({ onClose }: { onClose: () => void }) {
  const doc = useEditor((s) => s.history.present);
  const items = useEditor((s) => s.items);

  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frozen = useRef<ListSnapshot | null>(null); // the list at the first question
  const lastSeen = useRef<ListSnapshot | null>(null); // the list at the previous question
  const turns = useRef<ChatTurn[]>([]);
  const abort = useRef<AbortController | null>(null);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;

    const current = snapshotOf(doc, items);
    frozen.current ??= current;
    if (lastSeen.current) {
      const change = describeChange(lastSeen.current, current);
      if (change) turns.current.push({ kind: 'change', text: change });
    }
    lastSeen.current = current;
    turns.current.push({ kind: 'user', text: question });

    setDraft('');
    setError(null);
    setBusy(true);
    setLines((all) => [...all, { role: 'user', text: question }, { role: 'critic', text: '' }]);

    const controller = new AbortController();
    abort.current = controller;
    let reply = '';
    try {
      for await (const e of streamCritic({ snapshot: frozen.current, turns: turns.current, signal: controller.signal })) {
        if (e.type === 'delta') {
          reply += e.text;
          setLines((all) => [...all.slice(0, -1), { role: 'critic', text: reply }]);
        } else if (e.type === 'error') {
          setError(e.message);
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'The critic could not answer.');
    } finally {
      setBusy(false);
      if (reply) turns.current.push({ kind: 'assistant', text: reply });
      else {
        // No answer: take the question back so the next one starts from a valid turn order.
        turns.current.pop();
        setLines((all) => all.slice(0, -2));
      }
    }
  }

  return (
    <aside className="critic v2-glass" aria-label="Critic">
      <header>
        <b>Challenge me</b>
        <button
          type="button"
          className="ed-ghost"
          onClick={() => {
            abort.current?.abort();
            onClose();
          }}
        >
          Close
        </button>
      </header>
      <div className="critic-log" aria-live="polite">
        {lines.length === 0 ? <p>Ask the critic to defend or attack your ranking. It sees the list and your edits as you go.</p> : null}
        {lines.map((l, i) => (
          <p key={i} data-role={l.role}>
            {l.text || '…'}
          </p>
        ))}
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <form onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={lines.length === 0 ? 'Why is my #1 wrong?' : 'Reply…'}
          aria-label="Message the critic"
          maxLength={500}
          disabled={busy}
        />
        <button className="v2-btn" type="submit" disabled={busy || draft.trim().length === 0}>
          Send
        </button>
      </form>
    </aside>
  );
}
