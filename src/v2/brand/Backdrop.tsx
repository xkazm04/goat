import Link from 'next/link';

import { GoatConstellation } from './GoatConstellation';
import { GoatFacet } from './GoatFacet';
import { GoatSummit } from './GoatSummit';

import './brand.css';

export const GOAT_VARIANTS = [
  { id: 'a', name: 'Crest', note: 'Faceted gold head, heraldic' },
  { id: 'b', name: 'Constellation', note: 'A star chart goat, Capricorn' },
  { id: 'c', name: 'Summit', note: 'On the number-one step' },
] as const;

export type GoatVariant = (typeof GOAT_VARIANTS)[number]['id'];

export function parseVariant(value: string | undefined): GoatVariant | null {
  return GOAT_VARIANTS.some((v) => v.id === value) ? (value as GoatVariant) : null;
}

/** The goat as a decorative background layer. Pointer-transparent and hidden from assistive tech. */
export function GoatBackdrop({ variant }: { variant: GoatVariant | null }) {
  if (!variant) return null;
  return (
    <div className={`gb-root gb-${variant}`} aria-hidden="true">
      {variant === 'a' ? <GoatFacet className="gb-art" /> : null}
      {variant === 'b' ? <GoatConstellation className="gb-art" /> : null}
      {variant === 'c' ? <GoatSummit className="gb-art" /> : null}
    </div>
  );
}

/** Prototype-only: flip between the concepts on the landing page. Removed once one is chosen. */
export function GoatSwitcher({ current }: { current: GoatVariant | null }) {
  return (
    <nav className="gb-switch v2-glass" aria-label="Goat concept (prototype)">
      <span className="v2-eyebrow">Goat concept</span>
      {GOAT_VARIANTS.map((v) => (
        <Link key={v.id} href={`/?goat=${v.id}`} aria-current={current === v.id ? 'true' : undefined} title={v.note}>
          {v.id.toUpperCase()} · {v.name}
        </Link>
      ))}
      <Link href="/?goat=none" aria-current={current === null ? 'true' : undefined}>
        None
      </Link>
    </nav>
  );
}
