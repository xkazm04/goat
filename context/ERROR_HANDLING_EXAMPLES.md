# Error Handling System - Visual Examples & Usage Guide

## Quick Start

### 1. Import Required Dependencies

```typescript
import {
  useLoadingStateMachine,
  categorizeHttpError,
  createRetryRecoveryAction
} from '@/lib/hooks/useLoadingStateMachine';
import { LoadingErrorBoundary } from '@/app/features/match/components/LoadingErrorBoundary';
```

### 2. Initialize State Machine

```typescript
const {
  state,
  startLoading,
  setSuccess,
  setNetworkError,
  setValidationError,
  setServerError,
  setUnknownError,
  reset,
  isLoading,
  isError
} = useLoadingStateMachine();
```

### 3. Add Error Boundary to UI

```tsx
<LoadingErrorBoundary
  state={state}
  onDismiss={reset}
/>
```

## Visual Examples

### Example 1: Network Error

```typescript
const loadData = async () => {
  try {
    startLoading();
    const response = await fetch('/api/data');

    if (!response.ok) {
      throw new Error('Failed to fetch');
    }

    const data = await response.json();
    setSuccess(data);
  } catch (error) {
    const { errorType, message, details } = categorizeHttpError(error);

    const retryAction = createRetryRecoveryAction(
      async () => await loadData(),
      () => reset()
    );

    setNetworkError(message, retryAction, details);
  }
};
```

**Visual Result:**
```
┌─────────────────────────────────────────────────────────────┐
│  📡 Network Error                                       ✕   │
│                                                             │
│  Unable to connect to the server. Please check your        │
│  internet connection.                                       │
│                                                             │
│  [🔄 Retry]  [Dismiss]                                     │
└─────────────────────────────────────────────────────────────┘
```

### Example 2: 404 Not Found

```typescript
const loadList = async (listId: string) => {
  try {
    startLoading();
    const list = await apiClient.get(`/top/lists/${listId}`);
    setSuccess(list);
  } catch (error) {
    const { errorType, message, statusCode, details } = categorizeHttpError(error);

    const goHomeAction = () => {
      reset();
      router.push('/');
    };

    setValidationError(
      `List not found. The list you're looking for doesn't exist.`,
      goHomeAction,
      404,
      details
    );
  }
};
```

**Visual Result:**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Validation Error                                    ✕   │
│                                                             │
│  List not found. The list you're looking for doesn't       │
│  exist.                                                     │
│                                                             │
│  Status: 404                                                │
│                                                             │
│  [🔄 Go Home]  [Dismiss]  [ℹ️ Show Details]               │
└─────────────────────────────────────────────────────────────┘
```

### Example 3: Server Error with Auto-Retry

```typescript
const saveItem = async (item: Item, retryCount = 0) => {
  try {
    startLoading();

    const result = await apiClient.post('/top/items', item);
    setSuccess(result);

    toast.success('Item saved successfully!');
  } catch (error) {
    const { errorType, message, statusCode, details } = categorizeHttpError(error);

    // Auto-retry logic for server errors
    if (errorType === 'SERVER' && retryCount < 3) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

      setTimeout(() => {
        console.log(`Auto-retrying... (attempt ${retryCount + 1})`);
        saveItem(item, retryCount + 1);
      }, retryDelay);

      return;
    }

    // Manual retry after max attempts
    const retryAction = createRetryRecoveryAction(
      async () => await saveItem(item),
      () => reset()
    );

    setServerError(
      retryCount > 0
        ? `Failed after ${retryCount} attempts. ${message}`
        : message,
      retryAction,
      statusCode,
      details
    );
  }
};
```

**Visual Result (after 3 failed attempts):**
```
┌─────────────────────────────────────────────────────────────┐
│  💥 Server Error                                        ✕   │
│                                                             │
│  Failed after 3 attempts. Internal server error.            │
│  Please try again later.                                    │
│                                                             │
│  Status: 500                                                │
│                                                             │
│  [🔄 Retry]  [Dismiss]  [ℹ️ Show Details]                 │
└─────────────────────────────────────────────────────────────┘
```

### Example 4: Rate Limiting (429)

```typescript
const searchItems = async (query: string) => {
  try {
    startLoading();

    const results = await apiClient.get('/top/items/search', { q: query });
    setSuccess(results);
  } catch (error) {
    const { errorType, message, statusCode, details } = categorizeHttpError(error);

    if (statusCode === 429) {
      // Extract retry-after header if available
      const retryAfter = error.response?.headers?.get('Retry-After') || 60;

      const retryAction = createRetryRecoveryAction(
        async () => await searchItems(query),
        () => reset()
      );

      setValidationError(
        `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
        retryAction,
        429,
        details
      );

      // Auto-retry after delay
      setTimeout(() => {
        if (state.type === 'ERROR') {
          retryAction();
        }
      }, retryAfter * 1000);
    } else {
      setValidationError(message, undefined, statusCode, details);
    }
  }
};
```

**Visual Result:**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Validation Error                                    ✕   │
│                                                             │
│  Too many requests. Please wait 60 seconds before trying   │
│  again.                                                     │
│                                                             │
│  Status: 429                                                │
│                                                             │
│  Auto-retrying in 60 seconds...                             │
│                                                             │
│  [Dismiss]                                                  │
└─────────────────────────────────────────────────────────────┘
```

### Example 5: Multiple Sequential Operations

```typescript
const createAndPopulateList = async (listData: ListCreate, items: Item[]) => {
  try {
    // Step 1: Create list
    startLoading(0);
    updateProgress(10);

    const list = await apiClient.post('/top/lists', listData);
    updateProgress(30);

    // Step 2: Add items
    const totalItems = items.length;
    for (let i = 0; i < totalItems; i++) {
      await errorSimulator.simulateError(); // Test error during batch

      await apiClient.post(`/top/lists/${list.id}/items`, items[i]);

      // Update progress
      const progress = 30 + (70 * (i + 1) / totalItems);
      updateProgress(progress);
    }

    setSuccess(list);
    toast.success('List created and populated successfully!');

  } catch (error) {
    const { errorType, message, statusCode, details } = categorizeHttpError(error);

    const retryAction = createRetryRecoveryAction(
      async () => await createAndPopulateList(listData, items),
      () => reset()
    );

    // Provide context about which step failed
    const contextMessage = state.type === 'LOADING' && state.progress! < 30
      ? `Failed to create list: ${message}`
      : `Failed to add items: ${message}`;

    switch (errorType) {
      case 'NETWORK':
        setNetworkError(contextMessage, retryAction, details);
        break;
      case 'VALIDATION':
        setValidationError(contextMessage, retryAction, statusCode, details);
        break;
      case 'SERVER':
        setServerError(contextMessage, retryAction, statusCode, details);
        break;
      default:
        setUnknownError(contextMessage, retryAction, details);
    }
  }
};
```

### Example 6: Form Validation with Error Handling

```tsx
const CreateItemForm = () => {
  const {
    state,
    startLoading,
    setSuccess,
    setValidationError,
    reset
  } = useLoadingStateMachine();

  const onSubmit = async (formData: FormData) => {
    try {
      startLoading();

      // Client-side validation
      if (!formData.name || formData.name.length < 3) {
        setValidationError(
          'Item name must be at least 3 characters long',
          undefined,
          400,
          'Client-side validation failed'
        );
        return;
      }

      // API submission
      const result = await apiClient.post('/top/items', formData);
      setSuccess(result);

      toast.success('Item created successfully!');
      reset();

    } catch (error) {
      const { errorType, message, statusCode, details } = categorizeHttpError(error);

      // Handle validation errors specially
      if (statusCode === 422) {
        const validationErrors = error.response?.data?.errors || [];
        const errorMessage = validationErrors
          .map((err: any) => `${err.field}: ${err.message}`)
          .join(', ') || message;

        setValidationError(errorMessage, undefined, 422, JSON.stringify(validationErrors, null, 2));
      } else {
        setValidationError(message, undefined, statusCode, details);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <LoadingErrorBoundary state={state} onDismiss={reset} />

      {/* Form fields */}
      <input name="name" placeholder="Item name" />
      <textarea name="description" placeholder="Description" />

      <button type="submit" disabled={state.type === 'LOADING'}>
        {state.type === 'LOADING' ? 'Creating...' : 'Create Item'}
      </button>
    </form>
  );
};
```

## Testing Examples

### Console Testing

Open browser console and use:

```javascript
// Simulate network error
__errorSimulator.simulateNetwork();

// Simulate 404 error
__errorSimulator.simulate404();

// Simulate 500 server error
__errorSimulator.simulate500();

// Simulate slow network
__errorSimulator.simulateSlowNetwork();

// Custom error
__errorSimulator.enable({
  errorType: 'validation',
  statusCode: 422,
  delay: 1000,
  message: 'Custom validation error'
});

// Disable simulation
__errorSimulator.disable();
```

### Programmatic Testing

```typescript
import { enableErrorSimulator, disableErrorSimulator } from '@/lib/utils/error-simulator';

// Enable for specific test
beforeEach(() => {
  enableErrorSimulator({ errorType: 'network' });
});

// Disable after test
afterEach(() => {
  disableErrorSimulator();
});

// Test error handling
it('should handle network errors', async () => {
  enableErrorSimulator({ errorType: 'network' });

  const { result } = renderHook(() => useLoadingStateMachine());

  await act(async () => {
    await loadData();
  });

  expect(result.current.state.type).toBe('ERROR');
  expect(result.current.state.errorType).toBe('NETWORK');
});
```

## Integration Patterns

### Pattern 1: Page-Level Error Handling

```tsx
export default function MyPage() {
  const loadingStateMachine = useLoadingStateMachine();

  return (
    <div>
      <LoadingErrorBoundary
        state={loadingStateMachine.state}
        onDismiss={loadingStateMachine.reset}
      />

      <PageContent />
    </div>
  );
}
```

### Pattern 2: Component-Level Error Handling

```tsx
const MyComponent = () => {
  const localState = useLoadingStateMachine();

  return (
    <div>
      {localState.isError && (
        <LoadingErrorBoundary
          state={localState.state}
          onDismiss={localState.reset}
        />
      )}

      {localState.isLoading && <Spinner />}
      {localState.isSuccess && <SuccessContent />}
    </div>
  );
};
```

### Pattern 3: Global Error Boundary

```tsx
// _app.tsx or layout.tsx
const App = ({ children }) => {
  const globalErrorState = useLoadingStateMachine();

  return (
    <>
      <LoadingErrorBoundary
        state={globalErrorState.state}
        onDismiss={globalErrorState.reset}
      />

      <ErrorContext.Provider value={globalErrorState}>
        {children}
      </ErrorContext.Provider>
    </>
  );
};
```

## Advanced Techniques

### Technique 1: Error Recovery with Fallback

```typescript
const loadDataWithFallback = async () => {
  try {
    startLoading();

    // Try primary source
    const data = await apiClient.get('/api/data');
    setSuccess(data);

  } catch (primaryError) {
    console.warn('Primary source failed, trying fallback...');

    try {
      // Try fallback source
      const data = await apiClient.get('/api/fallback-data');
      setSuccess(data);

      // Show warning toast
      toast.warning('Using cached data');

    } catch (fallbackError) {
      // Both failed, show error
      const { errorType, message, details } = categorizeHttpError(fallbackError);

      setNetworkError(
        'Unable to load data from primary or fallback sources',
        createRetryRecoveryAction(
          async () => await loadDataWithFallback(),
          () => reset()
        ),
        details
      );
    }
  }
};
```

### Technique 2: Optimistic Updates with Rollback

```typescript
const updateItem = async (itemId: string, updates: Partial<Item>) => {
  // Store original state
  const originalItem = items.find(i => i.id === itemId);

  // Optimistic update
  setItems(items.map(i =>
    i.id === itemId ? { ...i, ...updates } : i
  ));

  try {
    startLoading();

    const result = await apiClient.put(`/top/items/${itemId}`, updates);
    setSuccess(result);

  } catch (error) {
    // Rollback on error
    setItems(items.map(i =>
      i.id === itemId ? originalItem! : i
    ));

    const { errorType, message, statusCode, details } = categorizeHttpError(error);

    const retryAction = createRetryRecoveryAction(
      async () => await updateItem(itemId, updates),
      () => reset()
    );

    setServerError(
      `Failed to update item: ${message}`,
      retryAction,
      statusCode,
      details
    );
  }
};
```

### Technique 3: Batch Operations with Error Collection

```typescript
const batchUpdateItems = async (updates: Array<{ id: string, data: Partial<Item> }>) => {
  const errors: Array<{ id: string, error: any }> = [];
  const successes: string[] = [];

  startLoading(0);

  for (let i = 0; i < updates.length; i++) {
    try {
      await apiClient.put(`/top/items/${updates[i].id}`, updates[i].data);
      successes.push(updates[i].id);
    } catch (error) {
      errors.push({ id: updates[i].id, error });
    }

    updateProgress(((i + 1) / updates.length) * 100);
  }

  if (errors.length === 0) {
    setSuccess({ successCount: successes.length });
    toast.success(`Updated ${successes.length} items successfully!`);
  } else {
    const errorDetails = errors.map(e =>
      `Item ${e.id}: ${e.error.message}`
    ).join('\n');

    setValidationError(
      `${successes.length} items updated, ${errors.length} failed`,
      undefined,
      undefined,
      errorDetails
    );
  }
};
```

## Best Practices Summary

1. **Always categorize errors** using `categorizeHttpError`
2. **Provide recovery actions** for all retryable errors
3. **Include technical details** for debugging
4. **Use appropriate error types** (network, validation, server, unknown)
5. **Reset state** before retry operations
6. **Show user-friendly messages** (not technical jargon)
7. **Test all error scenarios** using error simulator
8. **Handle edge cases** (offline, rate limiting, auth errors)
9. **Provide context** in error messages
10. **Log errors** for monitoring and debugging

## Color Reference

| Error Type | Primary Color | Secondary Color | Border Color |
|------------|---------------|-----------------|--------------|
| NETWORK | Orange (#f97316) | Red (#ef4444) | Orange/30 |
| VALIDATION | Yellow (#eab308) | Orange (#f97316) | Yellow/30 |
| SERVER | Red (#ef4444) | Pink (#ec4899) | Red/30 |
| UNKNOWN | Gray (#6b7280) | Slate (#64748b) | Gray/30 |

## Icon Reference

| Error Type | Icon | Animation | Description |
|------------|------|-----------|-------------|
| NETWORK | WifiOff | Pulse | Network connectivity issues |
| VALIDATION | AlertCircle | Bounce | User input or validation errors |
| SERVER | ServerCrash | Pulse | Backend server errors |
| UNKNOWN | HelpCircle | Pulse | Unexpected or unhandled errors |

## Quick Reference

```typescript
// Error categorization
const { errorType, message, statusCode, details } = categorizeHttpError(error);

// Set errors
setNetworkError(message, retryAction, details);
setValidationError(message, retryAction, statusCode, details);
setServerError(message, retryAction, statusCode, details);
setUnknownError(message, retryAction, details);

// Create retry action
const retryAction = createRetryRecoveryAction(
  async () => await operation(),
  () => reset()
);

// Check state
if (state.type === 'ERROR') { /* handle error */ }
if (isLoading) { /* show loading */ }
if (isSuccess) { /* show success */ }
```
