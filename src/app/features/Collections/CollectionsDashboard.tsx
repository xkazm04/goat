"use client";

import { memo, useState, useCallback } from "react";

import {
  useUserCollections,
  useCollectionOperations,
} from "@/hooks/use-collections";
import {
  useCollectionStore,
  useCollectionActions,
} from "@/stores/collection-store";
import { useCurrentUser, useUserLists } from "@/stores/use-list-store";

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
}

export const CollectionsDashboard = memo(function CollectionsDashboard({
  className = "",
}: CollectionsDashboardProps) {
  const user = useCurrentUser();
  const userLists = useUserLists();
  const { setSelectedCollection } = useCollectionActions();
  const collections = useCollectionStore((state) => state.collections);
  const selectedCollectionId = useCollectionStore(
    (state) => state.selectedCollectionId
  );

  // Fetch user collections
  const { data: fetchedCollections, isLoading } = useUserCollections({
    includeStats: true,
  });

  // Collection operations
  const { create, update, remove, removeList, isPending } = useCollectionOperations();

  // Modal state
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [editingCollection, setEditingCollection] =
    useState<ListCollection | null>(null);

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

  const handleDeleteCollection = useCallback(
    async (collection: ListCollection) => {
      try {
        await remove({ collectionId: collection.id });
        if (selectedCollectionId === collection.id) {
          setSelectedCollection(null);
        }
      } catch (error) {
        console.error("Failed to delete collection:", error);
      }
    },
    [remove, selectedCollectionId, setSelectedCollection]
  );

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
        console.error("Failed to remove list from collection:", error);
      }
    },
    [removeList, selectedCollection]
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
          onDeleteCollection={handleDeleteCollection}
        />
      </div>

      {/* Main content */}
      <CollectionView
        collection={selectedCollection}
        lists={listsInCollection}
        isLoading={isLoading}
        onRemoveList={selectedCollection ? handleRemoveListFromCollection : undefined}
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
      />
    </div>
  );
});
