import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/providers/query-provider';
import { BacklogProvider } from '@/providers/BacklogProvider';
import { PageTransition } from '@/components/page-transition';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { CommandPaletteProvider } from '@/app/features/CommandPalette';
import { ItemDetailPopupProvider } from '@/app/features/Collection/components/ItemDetailPopupProvider';
import { OfflineProvider } from '@/lib/offline';

const inter = Inter({ subsets: ['latin'] });

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
    images: [
      {
        url: `${baseUrl}/og-default.png`,
        width: 1200,
        height: 630,
        alt: 'G.O.A.T. - Greatest Of All Time Rankings',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'G.O.A.T. - Greatest Of All Time',
    description: 'Create, rank, and share your definitive lists.',
    site: '@goat_rankings',
    creator: '@goat_rankings',
    images: [`${baseUrl}/og-default.png`],
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
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            themes={['light', 'dark', 'experimental-dark']}
          >
            <BacklogProvider>
              <QueryProvider>
                <OfflineProvider showStatusIndicator enableAutoSync>
                  <CommandPaletteProvider>
                    {/* Skip to main content link for keyboard users */}
                    <a
                      href="#main-content"
                      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-cyan-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                      Skip to main content
                    </a>
                    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800/95 text-gray-100 w-full flex flex-col">
                      <main id="main-content" className="gradient-to-b" tabIndex={-1}>
                        <PageTransition>{children}</PageTransition>
                      </main>
                    </div>
                    <ItemDetailPopupProvider />
                  </CommandPaletteProvider>
                </OfflineProvider>
              </QueryProvider>
            </BacklogProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}