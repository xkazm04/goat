import { Big_Shoulders, Figtree, JetBrains_Mono } from 'next/font/google';

import '@/v2/ui/tokens.css';

import type { Metadata } from 'next';

const display = Big_Shoulders({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-v2-display',
});
const body = Figtree({ subsets: ['latin'], variable: '--font-v2-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-v2-mono' });

export const metadata: Metadata = {
  title: 'G.O.A.T. v2',
  description: 'Rank anything into a list worth publishing.',
  robots: { index: false, follow: false },
};

/**
 * The v2 shell. Built beside v1 until the swap (docs/v2/TECHNICAL_PACKAGE.md
 * §2); the root layout skips v1's chrome under /v2 (src/app/v1-chrome.tsx).
 */
export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <div className={`goat-v2 ${display.variable} ${body.variable} ${mono.variable}`}>{children}</div>;
}
