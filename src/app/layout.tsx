// Import dev CSS variable contract check (development only)
if (process.env.NODE_ENV === 'development') {
  import('./dev-css-var-check').then(mod => mod.checkCssVariableContract());
}
import './globals.css';
import { Inter, Space_Grotesk } from 'next/font/google';

import { AuthHeader, Toaster } from '@/components/auth';
import { PageTransition } from '@/components/page-transition';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { DeferredProviders } from '@/providers/DeferredProviders';
import { QueryProvider } from '@/providers/query-provider';

import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });
// Exposed as --font-space-grotesk (not --font-grotesk: that name is the
// Tailwind theme key that `font-grotesk` compiles to, and it reads THIS
// variable — see the @theme inline block in globals.css). Weights cover every
// `font-grotesk` call site: medium/unweighted (400/500) as well as
// semibold/bold/black, so no heading is snapped to a heavier face.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goat.app';

export const metadata: Metadata = {
  title: {
    default: 'G.O.A.T. - Greatest Of All Time',
    template: '%s | G.O.A.T.',
  },
  description: 'Create, rank, and share your definitive lists. Discover the Greatest Of All Time in movies, music, games, and more.',
  keywords: ['ranking', 'top lists', 'greatest of all time', 'GOAT', 'movies', 'music', 'games', 'lists'],
  authors: [{ name: 'G.O.A.T.' }],
  creator: 'G.O.A.T.',
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'G.O.A.T.',
    title: 'G.O.A.T. - Greatest Of All Time',
    description: 'Create, rank, and share your definitive lists. Discover the Greatest Of All Time in movies, music, games, and more.',
    // Every asset path here must exist under public/ — src/app/layout-assets.test.ts
    // checks that, and that the declared size is the PNG's real size. The
    // previous og-default.png / favicon set was never committed, so crawlers
    // and browsers 404'd on all four. goat.png is the artwork the repo has.
    images: [
      {
        url: `${baseUrl}/goat.png`,
        width: 896,
        height: 896,
        alt: 'G.O.A.T. - Greatest Of All Time Rankings',
      },
    ],
  },
  twitter: {
    // A square card image; `summary_large_image` expects a ~2:1 crop.
    card: 'summary',
    title: 'G.O.A.T. - Greatest Of All Time',
    description: 'Create, rank, and share your definitive lists.',
    site: '@goat_rankings',
    creator: '@goat_rankings',
    images: [`${baseUrl}/goat.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/goat.png',
    apple: '/goat.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} ${spaceGrotesk.variable}`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            // 'light' is intentionally NOT registered: design-tokens.css defines
            // tokens only as dark values under :root with no .light overrides, so
            // a 'light' theme renders unreadable dark-on-light surfaces. No UI
            // selects it and enableSystem is false, so dropping it is non-breaking
            // and removes the broken state. Re-add once a real light palette
            // exists (see docs/harness/followups-2026-06-16.md).
            themes={['dark', 'experimental-dark']}
          >
            <QueryProvider>
              <DeferredProviders>
                  {/* Skip to main content link for keyboard users */}
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:px-4 focus:py-2 focus:bg-brand-muted focus:text-white focus:rounded-lg focus-ring"
                  >
                    Skip to main content
                  </a>
                  <div className="min-h-screen bg-linear-to-b from-gray-900 to-gray-800/95 text-gray-100 w-full flex flex-col">
                    {/* Auth header -- sign in button or user menu */}
                    <div className="fixed top-4 right-4 z-toast">
                      <AuthHeader />
                    </div>
                    <main id="main-content" className="gradient-to-b" tabIndex={-1}>
                      <PageTransition>{children}</PageTransition>
                    </main>
                  </div>
                  <Toaster />
              </DeferredProviders>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
  );
}