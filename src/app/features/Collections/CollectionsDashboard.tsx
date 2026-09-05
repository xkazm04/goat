"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";

import {
  useUserCollections,
  useCollectionOperations,
} from "@/hooks/use-collections";
import {
  useCollectionStore,
  useCollectionActions,
} from "@/stores/collection-store";
import { useCurrentUser, useUserLists } from "@/stores/use-list-store";

import { AddListModal } from "./components/AddListModal";
import { CollectionManager } from "./components/CollectionManager";
import { CollectionSidebar } from "./components/CollectionSidebar";
import { CollectionView } from "./components/CollectionView";

import type {
  ListCollection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@/types/collection";

interface CollectionsDashboardProps {
  className?: string;
  /**
   * Collection to open with. The landing page deep-links private collections
   * as `/my-collections?selected=<id>` (CollectionsSection.tsx); until this
   * prop existed the dashboard ignored the parameter and every such link
   * landed on "All Lists".
   */
  initialSelectedId?: string | null;
}

export const CollectionsDashboard = memo(function CollectionsDashboard({
  className = "",
  initialSelectedId = null,
}: CollectionsDashboardProps) {
  const user = useCurrentUser();
  const userLists = useUserLists();
  const { setSelectedCollection } = useCollectionActions();

  // Honour the deep link once, on arrival. Later navigation inside the
  // dashboard owns the selection; a re-render with the same URL must not
  // yank the user back.
  const appliedInitialRef = useRef(false);
  useEffect(() => {
    if (appliedInitialRef.current || !initialSelectedId) return;
    appliedInitialRef.current = true;
    setSelectedCollection(initialSelectedId);
  }, [initialSelectedId, setSelectedCollection]);
  const collections = useCollectionStore((state) => state.collections);
  const selectedCollectionId = useCollectionStore(
    (state) => state.selectedCollectionId
  );

  // Fetch user collections. `isError`/`refetch` travel to the surfaces that
  // used to paint a failed load as "No collections yet".
  const { data: _fetchedCollections, isLoading, isError, refetch } = useUserCollections({
    includeStats: true,
  });
  const handleRetryLoad = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Collection operations
  const { create, update, remove, addLists, removeList, reorderLists, isPending } =
    useCollectionOperations();

  // Modal state
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isAddListOpen, setIsAddListOpen] = useState(false);
  const [editingCollection, setEditingCollection] =
    useState<ListCollection | null>(null);
  // Set when the delete was requested from the sidebar menu: the dialog opens
  // straight on its confirmation step instead of the edit form.
  const [deleteRequested, setDeleteRequested] = useState(false);

  // Get selected collection
  const selectedCollection = selectedCollectionId
    ? collections.find((c) => c.id === selectedCollectionId) || null
    : null;

  // Get lists for selected collection
  const listsInCollection = selectedCollection
    ? userLists.filter((list) =>
        selectedCollection.listIds.includes(list.id)
      )
    : userLists;

  // Lists the user owns that aren't already in the selected collection — the
  // pool offered by the Add-List picker.
  const candidateLists = selectedCollection
    ? userLists.filter(
        (list) => !selectedCollection.listIds.includes(list.id)
      )
    : [];

  // Handlers
  const handleSelectCollection = useCallback(
    (collection: ListCollection | null) => {
      setSelectedCollection(collection?.id || null);
    },
    [setSelectedCollection]
  );

  const handleCreateCollection = useCallback(() => {
    setEditingCollection(null);
    setIsManagerOpen(true);
  }, []);

  const handleEditCollection = useCallback((collection: ListCollection) => {
    setEditingCollection(collection);
    setIsManagerOpen(true);
  }, []);

  // Deleting is irreversible, so BOTH doors to it go through the dialog's
  // "Are you sure?" step: the dialog's own footer, and the sidebar menu, which
  // used to call `remove` directly with no confirmation. The rejection is NOT
  // caught here any more — useDeleteCollection raises no notification of its
  // own, and this wrapper's catch used to resolve, so the dialog read a failed
  // delete as success and closed over a collection that still existed.
  const handleDeleteCollection = useCallback(
    async (collection: ListCollection) => {
      await remove({ collectionId: collection.id });
      if (selectedCollectionId === collection.id) {
        setSelectedCollection(null);
      }
    },
    [remove, selectedCollectionId, setSelectedCollection]
  );

  const handleRequestDeleteCollection = useCallback((collection: ListCollection) => {
    setEditingCollection(collection);
    setDeleteRequested(true);
    setIsManagerOpen(true);
  }, []);

  const handleSaveCollection = useCallback(
    async (data: CreateCollectionRequest | UpdateCollectionRequest) => {
      if (editingCollection) {
        await update({
          collectionId: editingCollection.id,
          data: data as UpdateCollectionRequest,
        });
      } else {
        await create(data as CreateCollectionRequest);
      }
    },
    [editingCollection, create, update]
  );

  const handleCloseManager = useCallback(() => {
    setIsManagerOpen(false);
    setEditingCollection(null);
    setDeleteRequested(false);
  }, []);

  // Remove a list from the selected collection. Previously CollectionView was
  // rendered without onRemoveList, so the per-list remove control was hidden
  // and the collection-contents feature was inert.
  const handleRemoveListFromCollection = useCallback(
    async (listId: string) => {
      if (!selectedCollection) return;
      try {
        await removeList({ collectionId: selectedCollection.id, listId });
      } catch (error) {
        // Swallowed DELIBERATELY, and only since 2026-08-25: the mutation
        // hook (useRemoveListFromCollection) now reconciles by re-asking the
        // authority AND raises a user-visible notification. Catching here
        // only stops a rejected promise becoming an unhandled rejection.
        // Before that it was the ONLY handler, so a refused write left the
        // arrangement on screen with no reconciliation and no signal.
        console.debug("Failed to remove list from collection:", error);
      }
    },
    [removeList, selectedCollection]
  );

  // Reorder lists within the selected collection (drag-and-drop in CollectionView).
  // Previously CollectionView had no onReorderLists, so the drag handles were
  // inert and the persisted order never changed.
  const handleReorderLists = useCallback(
    async (listIds: string[]) => {
      if (!selectedCollection) return;
      try {
        await reorderLists({ collectionId: selectedCollection.id, listIds });
      } catch (error) {
        // Swallowed DELIBERATELY, and only since 2026-08-25: the mutation
        // hook (useReorderCollectionLists) now reconciles by re-asking the
        // authority AND raises a user-visible notification. Catching here
        // only stops a rejected promise becoming an unhandled rejection.
        // Before that it was the ONLY handler, so a refused write left the
        // arrangement on screen with no reconciliation and no signal.
        console.debug("Failed to reorder lists:", error);
      }
    },
    [reorderLists, selectedCollection]
  );

  // Open the Add-List picker. Previously the "Add list" affordance had no
  // handler, so there was no way to add lists to a collection from this view.
  const handleOpenAddList = useCallback(() => {
    setIsAddListOpen(true);
  }, []);

  const handleAddLists = useCallback(
    async (listIds: string[]) => {
      if (!selectedCollection || listIds.length === 0) return;
      try {
        await addLists({ collectionId: selectedCollection.id, listIds });
      } catch (error) {
        // Swallowed DELIBERATELY, and only since 2026-08-25: the mutation
        // hook (useAddListsToCollection) now reconciles by re-asking the
        // authority AND raises a user-visible notification. Catching here
        // only stops a rejected promise becoming an unhandled rejection.
        // Before that it was the ONLY handler, so a refused write left the
        // arrangement on screen with no reconciliation and no signal.
        console.debug("Failed to add lists to collection:", error);
      }
    },
    [addLists, selectedCollection]
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Sign in to manage your collections</p>
      </div>
    );
  }

  return (
    <div className={`flex h-[calc(100vh-4rem)] ${className}`}>
      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <CollectionSidebar
          selectedCollectionId={selectedCollectionId}
          onSelectCollection={handleSelectCollection}
          onCreateCollection={handleCreateCollection}
          onEditCollection={handleEditCollection}
          onDeleteCollection={handleRequestDeleteCollection}
          loadFailed={isError}
          onRetry={handleRetryLoad}
        />
      </div>

      {/* Main content */}
      <CollectionView
        collection={selectedCollection}
        lists={listsInCollection}
        isLoading={isLoading}
        loadFailed={isError}
        onRetry={handleRetryLoad}
        onRemoveList={selectedCollection ? handleRemoveListFromCollection : undefined}
        onReorderLists={selectedCollection ? handleReorderLists : undefined}
        onAddList={selectedCollection ? handleOpenAddList : undefined}
        stats={
          selectedCollection
            ? {
                listCount: selectedCollection.listIds.length,
                totalItems: 0,
                completedLists: 0,
                lastActivity: selectedCollection.updatedAt,
              }
            : undefined
        }
      />

      {/* Collection Manager Modal */}
      <CollectionManager
        isOpen={isManagerOpen}
        onClose={handleCloseManager}
        collection={editingCollection}
        parentCollections={collections.filter((c) => !c.parentId)}
        onSave={handleSaveCollection}
        onDelete={editingCollection ? handleDeleteCollection : undefined}
        confirmDeleteOnOpen={deleteRequested}
      />

      {/* Add-List Picker Modal */}
      <AddListModal
        isOpen={isAddListOpen}
        onClose={() => setIsAddListOpen(false)}
        candidateLists={candidateLists}
        onAdd={handleAddLists}
        isPending={isPending}
      />
    </div>
  );
});
