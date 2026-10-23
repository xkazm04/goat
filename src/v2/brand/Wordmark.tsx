import { GoatBust } from './GoatBust';

/** The G.O.A.T. lockup: the goat's head and the name. Used in headers, so it is one link-sized unit. */
export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="v2-lockup">
      <GoatBust size={size} />
      <span className="v2-wordmark">G.O.A.T.</span>
    </span>
  );
}
