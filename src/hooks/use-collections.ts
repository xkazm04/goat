/**
 * Collections Hooks
 *
 * React Query hooks for fetching and mutating collection data.
 * Provides data fetching, caching, and optimistic updates for collections.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { emitErrorNotification } from "@/lib/errors/error-notification-store";
import { listCollectionKeys, getCollectionInvalidationKeys } from "@/lib/query-keys/list-collections";
import { useCollectionStore } from "@/stores/collection-store";
import { useCurrentUser } from "@/stores/use-list-store";
import {
  type ListCollection,
  type CreateCollectionRequest,
  type UpdateCollectionRequest,
  type CollectionQueryParams,
  type ListCollectionWithStats,
} from "@/types/collection";

// API functions
async function fetchUserCollections(
  userId: string,
  params?: CollectionQueryParams
): Promise<ListCollection[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("user_id", userId);

  if (params?.parentId !== undefined) {
    searchParams.set("parent_id", params.parentId || "null");
  }
  if (params?.includeStats) {
    searchParams.set("include_stats", "true");
  }
  if (params?.includeChildren) {
    searchParams.set("include_children", "true");
  }
  if (params?.searchTerm) {
    searchParams.set("search", params.searchTerm);
  }
  if (params?.sortBy) {
    searchParams.set("sort_by", params.sortBy);
  }
  if (params?.sortOrder) {
    searchParams.set("sort_order", params.sortOrder);
  }

  const response = await fetch(`/api/collections?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch collections");
  }

  const result = await response.json();
  return result.data || result;
}

async function fetchCollection(
  collectionId: string,
  options?: { includeStats?: boolean; includeLists?: boolean }
): Promise<ListCollectionWithStats> {
  const searchParams = new URLSearchParams();

  if (options?.includeStats) {
    searchParams.set("include_stats", "true");
  }
  if (options?.includeLists) {
    searchParams.set("include_lists", "true");
  }

  const response = await fetch(
    `/api/collections/${collectionId}?${searchParams.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch collection");
  }

  const result = await response.json();
  return result.data || result;
}

async function createCollection(
  userId: string,
  data: CreateCollectionRequest
): Promise<ListCollection> {
  const response = await fetch("/api/collections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, user_id: userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create collection");
  }

  const result = await response.json();
  return result.data || result;
}

async function updateCollection(
  collectionId: string,
  data: UpdateCollectionRequest
): Promise<ListCollection> {
  const response = await fetch(`/api/collections/${collectionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to update collection");
  }

  const result = await response.json();
  return result.data || result;
}

async function deleteCollection(
  collectionId: string,
  cascade?: boolean
): Promise<void> {
  const searchParams = new URLSearchParams();
  if (cascade) {
    searchParams.set("cascade", "true");
  }

  const response = await fetch(
    `/api/collections/${collectionId}?${searchParams.toString()}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to delete collection");
  }
}

// Hooks

/**
 * Fetch all collections for the current user
 */
export function useUserCollections(params?: CollectionQueryParams) {
  const user = useCurrentUser();
  const { setCollections, setIsLoading } = useCollectionStore.getState();

  return useQuery({
    queryKey: listCollectionKeys.userCollections(user?.id || ""),
    queryFn: async () => {
      setIsLoading(true);
      try {
        const collections = await fetchUserCollections(user!.id, params);
        setCollections(collections);
        return collections;
      } finally {
        setIsLoading(false);
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single collection with optional stats/lists
 */
export function useCollection(
  collectionId: string | null,
  options?: { includeStats?: boolean; includeLists?: boolean }
) {
  return useQuery({
    queryKey: listCollectionKeys.detailWithStats(collectionId || ""),
    queryFn: () => fetchCollection(collectionId!, options),
    enabled: !!collectionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Create a new collection
 */
export function useCreateCollection() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const { addCollection } = useCollectionStore.getState();

  return useMutation({
    mutationFn: (data: CreateCollectionRequest) =>
      createCollection(user!.id, data),
    onSuccess: (newCollection) => {
      // Update local store immediately
      addCollection(newCollection);

      // Invalidate queries
      if (user) {
        queryClient.invalidateQueries({
          queryKey: listCollectionKeys.userCollections(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: listCollectionKeys.userTree(user.id),
        });
      }
    },
  });
}

/**
 * Update an existing collection
 */
export function useUpdateCollection() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const { updateCollection: updateStore } = useCollectionStore.getState();

  return useMutation({
    mutationFn: ({
      collectionId,
      data,
    }: {
      collectionId: string;
      data: UpdateCollectionRequest;
    }) => updateCollection(collectionId, data),
    onSuccess: (updatedCollection, { collectionId }) => {
      // Update local store immediately
      updateStore(collectionId, updatedCollection);

      // Invalidate queries
      if (user) {
        const invalidationKeys = getCollectionInvalidationKeys(
          user.id,
          collectionId,
          updatedCollection.parentId
        );
        invalidationKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
  });
}

/**
 * Delete a collection
 */
export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const { removeCollection } = useCollectionStore.getState();

  return useMutation({
    mutationFn: ({
      collectionId,
      cascade,
    }: {
      collectionId: string;
      cascade?: boolean;
    }) => deleteCollection(collectionId, cascade),
    onSuccess: (_, { collectionId }) => {
      // Update local store immediately
      removeCollection(collectionId);

      // Invalidate queries
      if (user) {
        queryClient.invalidateQueries({
          queryKey: listCollectionKeys.userCollections(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: listCollectionKeys.userTree(user.id),
        });
      }
    },
  });
}

/**
 * Add lists to a collection
 */
export function useAddListsToCollection() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const { addListToCollection } = useCollectionStore.getState();

  return useMutation({
    mutationFn: async ({
      collectionId,
      listIds,
    }: {
      collectionId: string;
      listIds: string[];
    }) => {
      const collection = await fetchCollection(collectionId);
      const updatedListIds = Array.from(new Set([...collection.listIds, ...listIds]));
      return updateCollection(collectionId, { listIds: updatedListIds });
    },
    onSuccess: (updatedCollection, { collectionId, listIds }) => {
      // Update local store
      listIds.forEach((listId) => {
        addListToCollection(collectionId, listId);
      });

      // Invalidate
      if (user) {
        queryClient.invalidateQueries({
          queryKey: listCollectionKeys.detail(collectionId),
        });
      }
    },
    onError: (error, { collectionId }) =>
      onMembershipWriteFailed(queryClient, collectionId, "collection-add-lists", error),
  });
}


/**
 * What a failed collection-membership write owes the user and the cache.
 *
 * Registry: client-state/optimistic-write-path.
 *
 * These three mutations paint nothing in the query cache themselves — the
 * arrangement the user sees during a drag lives in CollectionView's local
 * state. So there is no snapshot here to compare-and-swap; the honest revert is
 * to make the AUTHORITY re-answer, which discards the local arrangement the
 * server refused.
 *
 * The second half is the one that was missing entirely:
 * CollectionsDashboard.tsx caught every rejection with `console.error` and did
 * nothing else, so a rejected reorder left the list in an order the server had
 * refused, with no reconciliation and NO USER-VISIBLE SIGNAL. A local state that
 * quietly keeps a refused arrangement is indistinguishable from one the server
 * accepted. Losing the revert must never mean losing the failure.
 */
function onMembershipWriteFailed(
  queryClient: ReturnType<typeof useQueryClient>,
  collectionId: string,
  source: string,
  error: unknown,
) {
  queryClient.invalidateQueries({ queryKey: listCollectionKeys.detail(collectionId) });
  emitErrorNotification(error instanceof Error ? error : new Error(String(error)), { source });
}

/**
 * Remove lists from a collection
 */
export function useRemoveListFromCollection() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const { removeListFromCollection } = useCollectionStore.getState();

  return useMutation({
    mutationFn: async ({
      collectionId,
      listId,
    }: {
      collectionId: string;
      listId: string;
    }) => {
      const collection = await fetchCollection(collectionId);
      const updatedListIds = collection.listIds.filter((id) => id !== listId);
      return updateCollection(collectionId, { listIds: updatedListIds });
    },
    onSuccess: (_, { collectionId, listId }) => {
      // Update local store
      removeListFromCollection(collectionId, listId);

      // Invalidate
      if (user) {
        queryClient.invalidateQueries({
          queryKey: listCollectionKeys.detail(collectionId),
        });
      }
    },
    onError: (error, { collectionId }) =>
      onMembershipWriteFailed(queryClient, collectionId, "collection-remove-list", error),
  });
}

/**
 * Reorder lists within a collection
 */
export function useReorderCollectionLists() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();

  return useMutation({
    mutationFn: ({
      collectionId,
      listIds,
    }: {
      collectionId: string;
      listIds: string[];
    }) => updateCollection(collectionId, { listIds }),
    onSuccess: (_, { collectionId }) => {
      if (user) {
        queryClient.invalidateQueries({
          queryKey: listCollectionKeys.detail(collectionId),
        });
      }
    },
    onError: (error, { collectionId }) =>
      onMembershipWriteFailed(queryClient, collectionId, "collection-reorder-lists", error),
  });
}

/**
 * Combined hook providing all collection operations
 */
export function useCollectionOperations() {
  const { mutateAsync: create, isPending: isCreating } = useCreateCollection();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateCollection();
  const { mutateAsync: remove, isPending: isDeleting } = useDeleteCollection();
  const { mutateAsync: addLists, isPending: isAddingLists } = useAddListsToCollection();
  const { mutateAsync: removeList, isPending: isRemovingList } = useRemoveListFromCollection();
  const { mutateAsync: reorderLists, isPending: isReordering } = useReorderCollectionLists();

  return {
    create,
    update,
    remove,
    addLists,
    removeList,
    reorderLists,
    isPending:
      isCreating ||
      isUpdating ||
      isDeleting ||
      isAddingLists ||
      isRemovingList ||
      isReordering,
  };
}
