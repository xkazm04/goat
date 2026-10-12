import { NewList } from '@/v2/ui/NewList';

export const metadata = { title: 'New list · G.O.A.T. v2' };

export default async function NewListPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  return <NewList initialTopic={typeof topic === 'string' ? topic.slice(0, 120) : ''} />;
}
