'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchPersona, fetchRecommendations, type RecommendationView } from '@/v2/ai/client';
import { useSession } from '@/v2/auth/useSession';
import { Vignette } from '@/v2/brand/Vignette';
import { Wordmark } from '@/v2/brand/Wordmark';
import { Cover } from '@/v2/covers/Cover';
import { getBrowserClient } from '@/v2/db/browser';
import { indexedDbStorage } from '@/v2/list/storage';

import { readPersona, readRecs, writePersona, writeRecs, type CachedPersona } from './cache';
import { computeDna, fingerprint } from './dna';
import { PersonaCard } from './PersonaCard';
import { gatherTasteSources, type TasteSources } from './source';

import '@/v2/ui/editor.css';
import '@/v2/ui/dna.css';

const SHOWN = 5;

export function MeRoute() {
  const session = useSession();
  const settled = session.status !== 'connecting';
  const userId = session.status === 'guest' || session.status === 'member' ? session.userId : null;

  const [sources, setSources] = useState<TasteSources | null>(null);
  const [persona, setPersona] = useState<CachedPersona | null>(null);
  const [recs, setRecs] = useState<RecommendationView[] | null>(null);
  const [busy, setBusy] = useState<'persona' | 'recs' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    gatherTasteSources({ storage: indexedDbStorage(), client: getBrowserClient(), userId }).then((next) => {
      if (!cancelled) setSources(next);
    });
    return () => {
      cancelled = true;
    };
  }, [settled, userId]);

  const dna = useMemo(() => (sources ? computeDna(sources.lists, Date.now()) : null), [sources]);
  const key = dna ? fingerprint(dna) : null;

  // Reuse what this browser already holds for the same taste.
  useEffect(() => {
    if (!key) return;
    const cached = readPersona(localStorage);
    setPersona(cached && cached.fingerprint === key ? cached : null);
    setRecs(readRecs<RecommendationView>(localStorage, key, Date.now()));
  }, [key]);

  const run = useCallback(
    async (what: 'persona' | 'recs') => {
      if (!dna || !sources || !key) return;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setBusy(what);
      setError(null);
      try {
        if (what === 'persona') {
          const previous = readPersona(localStorage)?.cardNo ?? 0;
          const res = await fetchPersona({ dna, previousCardNo: previous, sourceLists: sources.listIds }, controller.signal);
          const next = { fingerprint: key, cardNo: res.cardNo, persona: res.persona };
          writePersona(localStorage, next);
          setPersona(next);
        } else {
          const items = await fetchRecommendations({ dna, topics: sources.topics, exclude: sources.titles }, controller.signal);
          writeRecs(localStorage, { fingerprint: key, at: Date.now(), items });
          setRecs(items);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      } finally {
        setBusy(null);
      }
    },
    [dna, sources, key],
  );

  if (!sources || !dna) {
    return (
      <p className="v2-wrap v2-eyebrow" role="status">
        Reading your lists…
      </p>
    );
  }

  return (
    <div className="v2-wrap">
      <header className="v2-bar">
        <Link href="/" aria-label="G.O.A.T. home">
          <Wordmark />
        </Link>
      </header>

      <h1 className="me-title">Your taste</h1>

      {dna.listCount === 0 ? (
        <div className="me-start">
          <Vignette className="me-vignette" label="1" />
          <p>
            Rank at least three items in a list and your taste card appears here.{' '}
            <Link href="/new">Start a list</Link> or <Link href="/l/demo">open the demo</Link>.
          </p>
        </div>
      ) : (
        <>
          <p className="me-sub">
            From {dna.listCount} {dna.listCount === 1 ? 'list' : 'lists'} and {dna.itemCount} ranked items.
          </p>

          <section className="me-grid">
            <div>
              {persona ? (
                <PersonaCard persona={persona.persona} dna={dna} cardNo={persona.cardNo} />
              ) : (
                <div className="me-empty v2-glass">
                  <Vignette className="me-vignette" label="?" />
                  <p>Your card is not written yet.</p>
                </div>
              )}
              <button type="button" className="v2-btn" onClick={() => void run('persona')} disabled={busy !== null}>
                {busy === 'persona' ? 'Writing…' : persona ? 'Write a new card' : 'Write my card'}
              </button>
            </div>

            <div>
              <h2 className="v2-eyebrow">Strongest traits</h2>
              <ul className="me-traits">
                {dna.traits.map((t) => (
                  <li key={t.name}>
                    <span>{t.name}</span>
                    <span className="me-meter">
                      <i style={{ width: `${Math.round(t.weight * 100)}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-labelledby="me-recs">
            <h2 id="me-recs" className="v2-eyebrow">
              For you
            </h2>
            <button type="button" className="v2-btn" onClick={() => void run('recs')} disabled={busy !== null}>
              {busy === 'recs' ? 'Looking…' : recs ? 'Refresh' : 'Recommend things I would like'}
            </button>
            {recs && recs.length > 0 ? (
              <ul className="me-recs">
                {recs.slice(0, SHOWN).map((r) => (
                  <li key={r.item.id} className="v2-glass">
                    <Cover item={r.item} title={false} />
                    <div>
                      <b>{r.item.title}</b>
                      <span className="me-match">{Math.round(r.match * 100)}% match</span>
                      <span>{[r.item.year, r.topic].filter(Boolean).join(' · ')}</span>
                      <p>{r.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {recs && recs.length === 0 ? <p role="status">Nothing new to suggest right now.</p> : null}
          </section>
        </>
      )}

      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
