import { MatchProviders } from '@/providers/MatchProviders';

export default function MatchLayout({ children }: { children: React.ReactNode }) {
  return <MatchProviders>{children}</MatchProviders>;
}
