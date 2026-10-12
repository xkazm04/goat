'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { docFromCandidates, type Candidate } from '@/v2/ai/candidate';
import { streamPool } from '@/v2/ai/client';
import { Cover } from '@/v2/covers/Cover';
import { indexedDbStorage } from '@/v2/list/storage';
import { createEditorStore } from '@/v2/list/store';
import { LIST_SIZES, type ListSize } from '@/v2/list/types';

import '@/v2/ui/editor.css';

type Phase = 'idle' | 'streaming' | 'ready' | 'error';

export function NewList({ initialTopic = '' }: { initialTopic?: string }) {
  const router = useRouter();
  const [topic, setTopic] = useState(initialTopic);
  const [size, setSize] = useState<ListSize>(25);
  const [phase, setPhase] = useState<Phase>('idle');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [dropped, setDropped] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (topic.trim().length < 2) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setPhase('streaming');
    setCandidates([]);
    setDropped(new Set());
    setError(null);
    try {
      for await (const e of streamPool({ topic, size, signal: controller.signal })) {
        if (e.type === 'candidate') setCandidates((all) => [...all, e.candidate]);
        else if (e.type === 'error') {
          setError(e.message);
          setPhase('error');
          return;
        } else setPhase('ready');
      }
      setPhase((p) => (p === 'streaming' ? 'ready' : p));
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : 'The pool could not be built.');
      setPhase('error');
    }
  }

  async function start() {
    const kept = candidates.filter((_, i) => !dropped.has(i));
    if (kept.length === 0) return;
    const id = crypto.randomUUID();
    const { doc, items, why } = docFromCandidates({ id, topic, size, candidates: kept });
    const { history } = createEditorStore({ doc: { ...doc, notes: why }, items }).getState();
    // The editor opens an unknown id from this browser's copy and syncs it from there.
    await indexedDbStorage().save(id, { version: 1, history, items, savedAt: new Date().toISOString() });
    router.push(`/v2/l/${id}`);
  }

  const keptCount = candidates.length - dropped.size;
  return (
    <div className="v2-wrap">
      <form className="v2-prompt v2-glass" onSubmit={generate} aria-label="Start a list">
        <input
          name="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="90s sci-fi films, albums of the 70s, pizza toppings…"
          aria-label="Topic"
          maxLength={120}
        />
        <select value={size} onChange={(e) => setSize(Number(e.target.value) as ListSize)} aria-label="List size">
          {LIST_SIZES.map((s) => (
            <option key={s} value={s}>
              Top {s}
            </option>
          ))}
        </select>
        <button className="v2-btn" type="submit" disabled={phase === 'streaming' || topic.trim().length < 2}>
          {phase === 'streaming' ? 'Building the pool…' : 'Build the pool'}
        </button>
      </form>

      {error ? <p role="alert">{error}</p> : null}

      {candidates.length > 0 ? (
        <section aria-label="Candidates">
          <p className="v2-eyebrow" role="status">
            {phase === 'streaming' ? `${candidates.length} so far…` : `${keptCount} of ${candidates.length} kept`}
          </p>
          <ul className="v2-roadmap">
            {candidates.map((c, i) => (
              <li key={`${c.title}-${i}`} className="v2-glass" data-dropped={dropped.has(i) || undefined}>
                <Cover
                  item={{
                    id: `preview-${i}`,
                    title: c.title,
                    year: c.year,
                    creator: c.creator,
                    imageUrl: null,
                    art: { hues: [c.art.hues[0], c.art.hues[1]], motif: c.art.motif },
                    traits: c.traits,
                  }}
                />
                <b>{c.title}</b>
                <span>{[c.year, c.creator].filter(Boolean).join(' · ')}</span>
                <span>{c.why}</span>
                <button
                  type="button"
                  className="v2-btn"
                  onClick={() =>
                    setDropped((s) => {
                      const next = new Set(s);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })
                  }
                >
                  {dropped.has(i) ? 'Keep' : 'Drop'}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="v2-btn" disabled={phase === 'streaming' || keptCount === 0} onClick={() => void start()}>
            Start ranking {keptCount}
          </button>
        </section>
      ) : null}
    </div>
  );
}
