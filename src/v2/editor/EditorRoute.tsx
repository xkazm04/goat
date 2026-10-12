'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSession } from '@/v2/auth/useSession';
import { getBrowserClient } from '@/v2/db/browser';
import { DEMO_ITEMS, demoDoc } from '@/v2/list/fixtures';
import { autosave, indexedDbStorage } from '@/v2/list/storage';
import { createEditorStore, type EditorStore } from '@/v2/list/store';
import { forkList, loadList, syncToSupabase, type SyncStatus } from '@/v2/list/sync';

import { EditorProvider } from './context';
import { Editor } from './Editor';

type Opened =
  | { phase: 'loading' }
  | { phase: 'missing' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; store: EditorStore; readOnly: boolean; fork?: () => Promise<void> };

const SYNC_TEXT: Record<SyncStatus, string> = {
  idle: 'Saved',
  saving: 'Saving…',
  saved: 'Saved to your account',
  error: 'Not synced, saved on this device',
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not open the list';
}

/**
 * Opens a list and wires its saving:
 * - `demo`: the bundled demo, saved in this browser only.
 * - your list: saved in this browser at once, pushed to Supabase shortly after.
 * - someone else's published list: read-only, with "Make it mine".
 */
export function EditorRoute({ listId }: { listId: string }) {
  return listId === 'demo' ? <DemoRoute /> : <RemoteRoute listId={listId} />;
}

function DemoRoute() {
  const [opened, setOpened] = useState<Opened>({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | null = null;
    const storage = indexedDbStorage();
    storage.load('demo').then((saved) => {
      if (cancelled) return;
      const store = saved
        ? createEditorStore({ history: saved.history, items: saved.items })
        : createEditorStore({ doc: demoDoc(), items: DEMO_ITEMS });
      stop = autosave(store, storage);
      setOpened({ phase: 'ready', store, readOnly: false });
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return <View opened={opened} status={{ text: 'Saved on this device' }} />;
}

function RemoteRoute({ listId }: { listId: string }) {
  const router = useRouter();
  const session = useSession();
  const [opened, setOpened] = useState<Opened>({ phase: 'loading' });
  const [sync, setSync] = useState<SyncStatus>('idle');

  const userId = session.status === 'guest' || session.status === 'member' ? session.userId : null;
  const settled = session.status !== 'connecting';

  useEffect(() => {
    if (!settled) return;
    let cancelled = false;
    const stops: (() => void)[] = [];
    const client = getBrowserClient();
    const storage = indexedDbStorage();

    async function open(): Promise<Opened> {
      if (!client) return { phase: 'error', message: 'Supabase is not configured, so only the demo list can open here.' };
      const remote = await loadList(client, listId);
      if (!remote) return { phase: 'missing' };

      if (userId && remote.ownerId === userId) {
        // This browser's copy is at least as fresh as the server's: every edit lands here first.
        const saved = await storage.load(listId);
        const store = saved
          ? createEditorStore({ history: saved.history, items: saved.items })
          : createEditorStore({ doc: remote.doc, items: remote.items });
        if (!cancelled) {
          stops.push(autosave(store, storage));
          stops.push(syncToSupabase(store, client, userId, setSync));
        }
        return { phase: 'ready', store, readOnly: false };
      }

      const store = createEditorStore({ doc: remote.doc, items: remote.items });
      const fork = userId
        ? async () => {
            const id = await forkList(client, store.getState().history.present, userId);
            router.push(`/v2/l/${id}`);
          }
        : undefined;
      return { phase: 'ready', store, readOnly: true, fork };
    }

    open().then(
      (next) => {
        if (!cancelled) setOpened(next);
      },
      (error: unknown) => {
        if (!cancelled) setOpened({ phase: 'error', message: message(error) });
      },
    );
    return () => {
      cancelled = true;
      for (const stop of stops) stop();
    };
  }, [listId, userId, settled, router]);

  const readOnly = opened.phase === 'ready' && opened.readOnly;
  return (
    <View
      opened={opened}
      status={readOnly ? { text: 'Read only' } : { text: SYNC_TEXT[sync], error: sync === 'error' }}
    />
  );
}

function View({ opened, status }: { opened: Opened; status: { text: string; error?: boolean } }) {
  if (opened.phase === 'loading') {
    return (
      <p className="v2-wrap v2-eyebrow" role="status">
        Opening the list…
      </p>
    );
  }
  if (opened.phase !== 'ready') {
    return (
      <div className="v2-wrap">
        <p role="alert">{opened.phase === 'missing' ? 'This list does not exist, or it is private.' : opened.message}</p>
        <Link href="/v2" className="v2-btn">
          Back to G.O.A.T.
        </Link>
      </div>
    );
  }

  const fork = opened.fork;
  const banner = opened.readOnly ? (
    <div className="ed-banner v2-glass">
      <span>This is someone else&apos;s list. Make your own copy to rank it your way.</span>
      {fork ? (
        <button type="button" className="v2-btn" onClick={() => void fork()}>
          Make it mine
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <EditorProvider value={opened.store}>
      <Editor readOnly={opened.readOnly} status={status} banner={banner} />
    </EditorProvider>
  );
}
