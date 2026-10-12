import { V2Shell } from '@/v2/ui/shell';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'G.O.A.T. v2',
  description: 'Rank anything into a list worth publishing.',
  robots: { index: false, follow: false },
};

/**
 * The v2 shell. Built beside v1 until the swap (docs/v2/TECHNICAL_PACKAGE.md
 * §2); the root layout skips v1 chrome under /v2 (src/app/v1-chrome.tsx).
 */
export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
