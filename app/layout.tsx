import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/app/components/ui/toaster';
import Navigation from '@/app/components/navigation/navigation';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tech Startup Boilerplate',
  description: 'A scalable project boilerplate for tech startups',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800/95 text-gray-100 w-full flex flex-col">
            <Navigation />
            <main className="gradient-to-b ">{children}</main>
          </div>
          <Toaster />
        </body>
    </html>
  );
}