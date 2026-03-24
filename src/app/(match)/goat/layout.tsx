// This page depends on searchParams and TanStack Query context — skip static prerendering
export const dynamic = 'force-dynamic';

export default function GoatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
