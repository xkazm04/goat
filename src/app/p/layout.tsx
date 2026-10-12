import { V2Shell } from '@/v2/ui/shell';

/** Published lists (/p/<slug>) use the v2 shell; v1 chrome is skipped for this path (src/app/v1-chrome.tsx). */
export default function PublishedLayout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
