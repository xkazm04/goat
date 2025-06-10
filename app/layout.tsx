import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/app/providers/query-provider';

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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800/95 text-gray-100 w-full flex flex-col">
            <main className="gradient-to-b ">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}