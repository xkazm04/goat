import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/app/providers/query-provider';
import { BacklogProvider } from './providers/BacklogProvider';

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
          <BacklogProvider>
            <QueryProvider>
              <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800/95 text-gray-100 w-full flex flex-col">
                <main className="gradient-to-b">{children}</main>
              </div>
            </QueryProvider>
          </BacklogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}