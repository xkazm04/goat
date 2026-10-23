import { Big_Shoulders, Figtree, JetBrains_Mono } from 'next/font/google';

import '@/v2/ui/base.css';
import '@/v2/ui/tokens.css';

const display = Big_Shoulders({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-v2-display',
});
const body = Figtree({ subsets: ['latin'], variable: '--font-v2-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-v2-mono' });

/** The v2 look (tokens and fonts), shared by /v2, the share page and the embed. */
export function V2Shell({ children }: { children: React.ReactNode }) {
  return <div className={`goat-v2 ${display.variable} ${body.variable} ${mono.variable}`}>{children}</div>;
}
