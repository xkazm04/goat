import type { ListDoc, ListItem } from '@/v2/list/types';

export type EmbedMode = 'mosaic' | 'spread';

export function embedMode(value: string | undefined): EmbedMode {
  return value === 'spread' ? 'spread' : 'mosaic';
}

const SHOWN = 10;

const swatch = (item: ListItem) => `linear-gradient(160deg, hsl(${item.art.hues[0]} 70% 42%), hsl(${item.art.hues[1]} 70% 24%))`;

/**
 * The compact view inside an iframe: a static server-rendered Mosaic (a grid
 * of ranked covers) or Spread (a ranked table). It does not reuse the
 * editor's components, which need drag and drop and a store; an embed only
 * has to show the ranking and link back.
 */
export function EmbedList({
  doc,
  items,
  mode,
  href,
}: {
  doc: ListDoc;
  items: Record<string, ListItem>;
  mode: EmbedMode;
  href: string;
}) {
  const ranked = doc.order.flatMap((id) => (items[id] ? [items[id]] : [])).slice(0, SHOWN);

  return (
    <main className="em" data-mode={mode}>
      <header>
        <span className="em-eyebrow">{`Top ${doc.size} · ${doc.topic}`}</span>
        <h1>{doc.title}</h1>
      </header>

      {ranked.length === 0 ? <p>This list has no ranking yet.</p> : null}

      {mode === 'mosaic' ? (
        <ol className="em-grid">
          {ranked.map((item, i) => (
            <li key={item.id} style={{ background: swatch(item) }}>
              <span className="em-rank">{`#${i + 1}`}</span>
              <span className="em-name">{item.title}</span>
              {item.year !== null ? <span className="em-year">{item.year}</span> : null}
            </li>
          ))}
        </ol>
      ) : (
        <ol className="em-rows">
          {ranked.map((item, i) => (
            <li key={item.id}>
              <span className="em-rank">{i + 1}</span>
              <span className="em-chip" style={{ background: swatch(item) }} aria-hidden="true" />
              <span className="em-name">{item.title}</span>
              <span className="em-year">{[item.year, item.creator].filter((v) => v !== null && v !== '').join(' · ')}</span>
            </li>
          ))}
        </ol>
      )}

      <footer>
        <a href={href} target="_blank" rel="noopener noreferrer">
          See the full list on G.O.A.T.
        </a>
      </footer>
    </main>
  );
}
