import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/providers/query-provider';
import { BacklogProvider } from '@/providers/BacklogProvider';
import { PageTransition } from '@/components/page-transition';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { CommandPaletteProvider } from '@/app/features/CommandPalette';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'G.O.A.T.',
  description: 'Greatest Of All Time',
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
                <CommandPaletteProvider>
                  <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800/95 text-gray-100 w-full flex flex-col">
                    <main className="gradient-to-b">
                      <PageTransition>{children}</PageTransition>
                    </main>
                  </div>
                </CommandPaletteProvider>
              </QueryProvider>
            </BacklogProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}