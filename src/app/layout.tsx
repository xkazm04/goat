import { siteOrigin } from '@/v2/publish/server';
import { V2Shell } from '@/v2/ui/shell';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: 'G.O.A.T. · Greatest of All Time', template: '%s' },
  description: 'Rank anything into a list worth publishing. Name a topic, let AI fill the pool, then rank it your way.',
  openGraph: { type: 'website', siteName: 'G.O.A.T.' },
};

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#06070c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <V2Shell>{children}</V2Shell>
      </body>
    </html>
  );
}
