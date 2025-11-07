/**
 * Example usage of useCollection hook
 * This file demonstrates the hook's functionality and can be used as a reference
 */

import { useCollection } from './useCollection';

// Example 1: Basic usage with category filtering
function ExampleBasicUsage() {
  const collection = useCollection({
    category: 'movies',
    subcategory: 'action'
  });

  if (collection.isLoading) return <div>Loading...</div>;
  if (collection.isError) return <div>Error: {collection.error?.message}</div>;

  return (
    <div>
      <h1>Action Movies</h1>
      <input
        type="text"
        value={collection.filter.searchTerm}
        onChange={(e) => collection.setSearchTerm(e.target.value)}
        placeholder="Search movies..."
      />

      <div>
        {collection.filteredItems.map((item) => (
          <div key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>

      <p>
        Showing {collection.stats.selectedItems} of {collection.stats.totalItems} items
      </p>
    </div>
  );
}

// Example 2: Paginated collection
function ExamplePaginatedCollection() {
  const collection = useCollection({
    category: 'books',
    enablePagination: true,
    pageSize: 20
  });

  return (
    <div>
      <h1>Books Catalog</h1>

      {collection.filteredItems.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}

      {/* Pagination controls */}
      <div>
        <button
          onClick={collection.pagination.prevPage}
          disabled={collection.pagination.page === 1}
        >
          Previous
        </button>

        <span>
          Page {collection.pagination.page} of {collection.pagination.totalPages}
        </span>

        <button
          onClick={collection.pagination.nextPage}
          disabled={!collection.pagination.hasMore}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// Example 3: Collection with mutations
function ExampleCollectionWithMutations() {
  const collection = useCollection({
    category: 'tasks'
  });

  const handleAddTask = () => {
    collection.mutations.addItem.mutate({
      title: 'New Task',
      description: 'Task description',
      category: 'tasks',
      tags: ['work']
    });
  };

  const handleDeleteTask = (itemId: string) => {
    collection.mutations.deleteItem.mutate(itemId);
  };

  const handleUpdateTask = (itemId: string, newTitle: string) => {
    collection.mutations.updateItem.mutate({
      id: itemId,
      title: newTitle
    });
  };

  return (
    <div>
      <button onClick={handleAddTask}>
        Add Task
        {collection.mutations.addItem.isLoading && ' (Adding...)'}
      </button>

      {collection.filteredItems.map((item) => (
        <div key={item.id}>
          <span>{item.title}</span>
          <button onClick={() => handleUpdateTask(item.id, 'Updated!')}>
            Edit
          </button>
          <button onClick={() => handleDeleteTask(item.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

// Example 4: Group selection
function ExampleGroupSelection() {
  const collection = useCollection({
    category: 'media'
  });

  return (
    <div>
      <h1>Media Collection</h1>

      {/* Group selector */}
      <div>
        <button onClick={collection.selectAllGroups}>Select All</button>
        <button onClick={collection.deselectAllGroups}>Deselect All</button>

        {collection.groups.map((group) => (
          <label key={group.id}>
            <input
              type="checkbox"
              checked={collection.filter.selectedGroupIds.has(group.id)}
              onChange={() => collection.toggleGroup(group.id)}
            />
            {group.name} ({group.count})
          </label>
        ))}
      </div>

      {/* Stats */}
      <div>
        <p>Total Items: {collection.stats.totalItems}</p>
        <p>Selected Items: {collection.stats.selectedItems}</p>
        <p>Visible Groups: {collection.stats.visibleGroups} / {collection.stats.totalGroups}</p>
      </div>

      {/* Items */}
      <div>
        {collection.filteredItems.map((item) => (
          <div key={item.id}>{item.title}</div>
        ))}
      </div>
    </div>
  );
}

// Example 5: Infinite scroll
function ExampleInfiniteScroll() {
  const collection = useCollection({
    category: 'posts',
    enableInfiniteScroll: true,
    pageSize: 30
  });

  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && collection.infiniteScroll?.hasNextPage) {
          collection.infiniteScroll.fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [collection.infiniteScroll]);

  return (
    <div>
      <h1>Posts Feed</h1>

      {collection.filteredItems.map((item) => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
        </div>
      ))}

      <div ref={loadMoreRef}>
        {collection.infiniteScroll?.isFetchingNextPage && (
          <div>Loading more...</div>
        )}
      </div>
    </div>
  );
}

export {
  ExampleBasicUsage,
  ExamplePaginatedCollection,
  ExampleCollectionWithMutations,
  ExampleGroupSelection,
  ExampleInfiniteScroll
};
