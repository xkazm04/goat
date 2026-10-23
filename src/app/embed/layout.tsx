import '@/v2/ui/embed.css';

import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The iframe embed (/embed/<slug>): the shared shell with its own compact styles and no site chrome. */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
