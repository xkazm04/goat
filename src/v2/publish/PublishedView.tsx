'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSession } from '@/v2/auth/useSession';
import { getBrowserClient } from '@/v2/db/browser';
import { EditorProvider } from '@/v2/editor/context';
import { Editor } from '@/v2/editor/Editor';
import { createEditorStore } from '@/v2/list/store';
import { forkList, type LoadedList } from '@/v2/list/sync';

import '@/v2/ui/editor.css';

/**
 * A published list, read-only, in whichever mode the visitor picks. "Make it
 * mine" copies it into a new private list for a signed-in (guest) visitor.
 */
export function PublishedView({ loaded }: { loaded: LoadedList }) {
  const router = useRouter();
  const session = useSession();
  const userId = session.status === 'guest' || session.status === 'member' ? session.userId : null;
  const [store] = useState(() => createEditorStore({ doc: loaded.doc, items: loaded.items }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fork() {
    const client = getBrowserClient();
    if (!client || !userId) return;
    setBusy(true);
    setError(null);
    try {
      const id = await forkList(client, store.getState().history.present, userId);
      router.push(`/l/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not copy this list.');
      setBusy(false);
    }
  }

  const banner = (
    <div className="ed-banner v2-glass">
      <span>Make your own copy of this list and rank it your way.</span>
      <button type="button" className="v2-btn" onClick={() => void fork()} disabled={!userId || busy}>
        {busy ? 'Copying…' : 'Make it mine'}
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );

  return (
    <EditorProvider value={store}>
      <Editor readOnly status={{ text: 'Published' }} banner={banner} />
    </EditorProvider>
  );
}
