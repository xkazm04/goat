import { EditorRoute } from '@/v2/editor/EditorRoute';

import '@/v2/ui/editor.css';

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorRoute listId={id} />;
}
