import Link from 'next/link';

import { GoatBackdrop } from '@/v2/brand/Backdrop';
import { Wordmark } from '@/v2/brand/Wordmark';
import { HomeLists } from '@/v2/ui/HomeLists';
import { SessionChip } from '@/v2/ui/SessionChip';

import '@/v2/ui/dna.css';
import '@/v2/ui/editor.css';

export default function Home() {
  return (
    <div className="home">
      <GoatBackdrop />
      <div className="v2-wrap home-content">
      <header className="v2-bar">
        <Wordmark />
        <nav aria-label="Account" className="v2-nav">
          <Link href="/me">Your taste</Link>
          <SessionChip />
        </nav>
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
        <form className="v2-prompt v2-glass" action="/new" aria-label="Start a list">
          <input
            id="v2-topic"
            name="topic"
            placeholder="90s sci-fi films, albums of the 70s, pizza toppings…"
            aria-label="Topic"
          />
          <button className="v2-btn" type="submit">
            Build the pool
          </button>
        </form>
      </section>

      <HomeLists />
    </div>
    </div>
  );
}
