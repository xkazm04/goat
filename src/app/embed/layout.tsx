import { V2Shell } from '@/v2/ui/shell';

import '@/v2/ui/embed.css';

import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The iframe embed (/embed/<slug>): the v2 look with no site chrome. */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
