// This page depends on user auth and TanStack Query context — skip static prerendering
export const dynamic = 'force-dynamic';

export default function MyCollectionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
