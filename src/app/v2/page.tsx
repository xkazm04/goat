import { SessionChip } from '@/v2/ui/SessionChip';

const MILESTONES = [
  { id: 'M0', name: 'Ground', detail: 'Shell, schema, guest sessions, isolation rule', state: 'done' },
  { id: 'M1', name: 'List core', detail: 'One list document, Spread and Mosaic, undo', state: 'next' },
  { id: 'M2', name: 'Four modes', detail: 'Canvas and Stage, the mode-switch morph', state: 'later' },
  { id: 'M3', name: 'Create with AI', detail: 'Prompt to a streaming candidate pool on Claude', state: 'later' },
  { id: 'M4', name: 'Co-curator', detail: 'Critic chat and gap spotter', state: 'later' },
  { id: 'M5', name: 'Taste DNA', detail: 'Persona card and recommendations', state: 'later' },
  { id: 'M6', name: 'Publish', detail: 'Public page, social card, embed', state: 'later' },
  { id: 'M7', name: 'Swap', detail: 'v2 moves to /, v1 is deleted', state: 'later' },
] as const;

export default function V2Home() {
  return (
    <div className="v2-wrap">
      <header className="v2-bar">
        <span className="v2-wordmark">
          G.O.A.T.<small>v2</small>
        </span>
        <SessionChip />
      </header>

      <section className="v2-hero" aria-labelledby="v2-title">
        <span className="v2-eyebrow">Rank anything</span>
        <h1 id="v2-title">
          What is the <em>greatest</em>…?
        </h1>
        <p>
          Name a topic and AI fills a pool of candidates. Then rank them as a poster wall, a board, an editorial page or a
          stage, and publish the result.
        </p>
        <form className="v2-prompt v2-glass" aria-label="Start a list">
          <input
            id="v2-topic"
            name="topic"
            placeholder="90s sci-fi films, albums of the 70s, pizza toppings…"
            aria-label="Topic"
            disabled
          />
          <button className="v2-btn" type="submit" disabled>
            Coming in M3
          </button>
        </form>
      </section>

      <section aria-labelledby="v2-roadmap-title">
        <h2 id="v2-roadmap-title" className="v2-eyebrow">
          Build progress
        </h2>
        <ol className="v2-roadmap">
          {MILESTONES.map((m) => (
            <li key={m.id} className="v2-glass" data-state={m.state}>
              <span className="v2-num">{m.id}</span>
              <b>{m.name}</b>
              <span>{m.detail}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
