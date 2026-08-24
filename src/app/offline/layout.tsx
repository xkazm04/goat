// Client component page — skip static prerendering
export const dynamic = 'force-dynamic';

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
