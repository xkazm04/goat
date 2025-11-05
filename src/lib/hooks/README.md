# Loading State Machine with Error Handling

## Overview

This implementation provides a comprehensive error handling system for the loading state machine that captures error context, supports error recovery actions, and provides user-friendly error messages. Each error state includes error type, message, and optional recovery action (retry, dismiss, navigate).

## Files Created/Modified

### 1. **src/lib/hooks/useLoadingStateMachine.ts**
   - **Purpose**: Core state machine hook with error handling
   - **Features**:
     - Type-safe state machine with 4 states: IDLE, LOADING, SUCCESS, ERROR
     - 4 error types: NETWORK, VALIDATION, SERVER, UNKNOWN
     - Error metadata with recovery actions
     - Utility functions for error categorization
     - Automatic HTTP error classification based on status codes

### 2. **src/app/features/Match/components/LoadingErrorBoundary.tsx**
   - **Purpose**: Elegant error UI component with recovery actions
   - **Features**:
     - Animated error toast that slides in from top
     - Color-coded by error type (orange=network, yellow=validation, red=server, gray=unknown)
     - Animated icons (pulse/bounce effects)
     - Retry and dismiss buttons
     - Expandable technical details section
     - Timestamp display
     - Context-aware recovery actions

### 3. **src/app/match/page.tsx** (Updated)
   - **Purpose**: Integrated error handling in match page
   - **Changes**:
     - Added loading state machine integration
     - Wrapped API calls in try-catch with error categorization
     - Integrated LoadingErrorBoundary component
     - Added recovery actions for all async operations
     - Comprehensive error handling for:
       - List loading from API
       - Backend sync operations
       - Backlog initialization

### 4. **src/lib/api/client.ts** (Enhanced)
   - **Purpose**: Enhanced API client with structured errors
   - **Changes**:
     - Added structured error objects with status codes
     - Network error detection
     - Response status and data in error objects
     - Better error messages

### 5. **src/app/api/webhooks/clerk/route.ts** (Fixed)
   - **Purpose**: Fixed Next.js 15 compatibility issue
   - **Changes**:
     - Added `await` for `headers()` call (Next.js 15 requirement)

### 6. **src/lib/hooks/useLoadingStateMachine.test.md**
   - **Purpose**: Comprehensive testing documentation
   - **Contents**:
     - Test scenarios for all error types
     - Manual testing checklist
     - Integration test flows
     - Browser console testing commands
     - Error telemetry recommendations

---

## Architecture

### State Machine Flow

```
IDLE
  ↓
START_LOADING → LOADING (with optional progress)
  ↓
  ├─→ SET_SUCCESS → SUCCESS
  ├─→ SET_NETWORK_ERROR → ERROR (Network)
  ├─→ SET_VALIDATION_ERROR → ERROR (Validation)
  ├─→ SET_SERVER_ERROR → ERROR (Server)
  └─→ SET_UNKNOWN_ERROR → ERROR (Unknown)

ERROR
  ├─→ RESET → IDLE
  └─→ Recovery Action → LOADING (triggers retry)
```

### Error Type Classification

| Error Type | Status Codes | Color | Icon | Animation |
|------------|-------------|-------|------|-----------|
| **NETWORK** | Timeout, fetch failures | Orange | WifiOff | Pulse |
| **VALIDATION** | 400-499 | Yellow | AlertCircle | Bounce |
| **SERVER** | 500-599 | Red | ServerCrash | Pulse |
| **UNKNOWN** | Other errors | Gray | HelpCircle | Pulse |

---

## Usage

### Basic Usage

```typescript
import { useLoadingStateMachine } from '@/lib/hooks/useLoadingStateMachine';

function MyComponent() {
  const loadingStateMachine = useLoadingStateMachine();

  const loadData = async () => {
    try {
      loadingStateMachine.startLoading();

      const data = await fetchData();

      loadingStateMachine.setSuccess(data);
    } catch (error) {
      const { errorType, message, statusCode, details } = categorizeHttpError(error);

      const retryAction = createRetryRecoveryAction(
        async () => await loadData(),
        () => loadingStateMachine.reset()
      );

      switch (errorType) {
        case 'NETWORK':
          loadingStateMachine.setNetworkError(message, retryAction, details);
          break;
        case 'VALIDATION':
          loadingStateMachine.setValidationError(message, retryAction, statusCode, details);
          break;
        case 'SERVER':
          loadingStateMachine.setServerError(message, retryAction, statusCode, details);
          break;
        default:
          loadingStateMachine.setUnknownError(message, retryAction, details);
      }
    }
  };

  return (
    <div>
      <LoadingErrorBoundary
        state={loadingStateMachine.state}
        onDismiss={loadingStateMachine.reset}
      />

      {loadingStateMachine.isLoading && <Spinner />}
      {loadingStateMachine.isSuccess && <SuccessContent />}
    </div>
  );
}
```

### Advanced: Custom Error Handling

```typescript
// Custom error with specific recovery action
const handleCustomError = (error: any) => {
  const retryAction = () => {
    // Custom recovery logic
    console.log('Attempting custom recovery...');
    loadingStateMachine.reset();
    loadData();
  };

  loadingStateMachine.setValidationError(
    'Custom validation failed',
    retryAction,
    400,
    error.details
  );
};
```

### Error State Properties

When `state.type === 'ERROR'`, the state includes:

```typescript
{
  type: 'ERROR',
  errorType: 'NETWORK' | 'VALIDATION' | 'SERVER' | 'UNKNOWN',
  message: string,                    // User-friendly message
  recoveryAction?: () => void,        // Optional retry function
  timestamp: number,                  // Error occurrence time
  statusCode?: number,                // HTTP status code (if applicable)
  details?: string                    // Technical details for debugging
}
```

---

## API Reference

### useLoadingStateMachine Hook

#### Returns: `UseLoadingStateMachineReturn`

```typescript
{
  state: LoadingState;                // Current state

  // State transitions
  startLoading: (progress?: number) => void;
  setSuccess: (data?: any) => void;
  setNetworkError: (message: string, recoveryAction?: () => void, details?: string) => void;
  setValidationError: (message: string, recoveryAction?: () => void, statusCode?: number, details?: string) => void;
  setServerError: (message: string, recoveryAction?: () => void, statusCode?: number, details?: string) => void;
  setUnknownError: (message: string, recoveryAction?: () => void, details?: string) => void;
  updateProgress: (progress: number) => void;
  reset: () => void;

  // Computed state helpers
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isIdle: boolean;
}
```

### Utility Functions

#### `categorizeHttpError(error: any)`

Categorizes HTTP errors based on status codes and error types.

**Returns:**
```typescript
{
  errorType: ErrorType;
  statusCode?: number;
  message: string;
  details?: string;
}
```

**Examples:**
- Network timeout → `{ errorType: 'NETWORK', message: 'Network request timed out...' }`
- 404 error → `{ errorType: 'VALIDATION', statusCode: 404, message: 'The requested resource was not found.' }`
- 500 error → `{ errorType: 'SERVER', statusCode: 500, message: 'Internal server error...' }`

#### `createRetryRecoveryAction(originalAction, onRetry?)`

Creates a recovery action function that wraps the original operation with retry logic.

**Parameters:**
- `originalAction: () => Promise<void>` - The async operation to retry
- `onRetry?: () => void` - Optional callback before retry (e.g., reset state)

**Returns:** `() => void` - Recovery function for the error state

---

## LoadingErrorBoundary Component

### Props

```typescript
interface LoadingErrorBoundaryProps {
  state: LoadingState;          // Current loading state
  onDismiss: () => void;        // Dismiss callback
}
```

### Features

1. **Animated Entry/Exit**
   - Slides in from top with spring animation
   - Smooth exit animation
   - Automatic positioning (centered at top)

2. **Error Type Styling**
   - Color-coded by error type
   - Animated icons
   - Gradient backgrounds
   - Decorative elements

3. **User Actions**
   - **Retry Button**: Executes recovery action if available
   - **Dismiss Button**: Closes the error toast
   - **Show/Hide Details**: Expands technical details section

4. **Information Display**
   - Error title and message
   - Status code badge (if applicable)
   - Timestamp
   - Expandable technical details

---

## Error Messages

### Network Errors
- Timeout: "Network request timed out. Please check your connection."
- Failed fetch: "Unable to connect to the server. Please check your internet connection."

### Validation Errors (4xx)
- 400: "Invalid request. Please check your input."
- 401: "Authentication required. Please sign in."
- 403: "You do not have permission to access this resource."
- 404: "The requested resource was not found."
- 409: "A conflict occurred. The resource may have been modified."
- 422: "Validation failed. Please check your input."
- 429: "Too many requests. Please try again later."

### Server Errors (5xx)
- 500: "Internal server error. Please try again later."
- 502: "Bad gateway. The server is temporarily unavailable."
- 503: "Service unavailable. Please try again later."
- 504: "Gateway timeout. The server took too long to respond."

### Unknown Errors
- Default: "An unexpected error occurred. Please try again."

---

## Testing

### Manual Testing

1. **Test Network Errors**
   ```javascript
   // In browser DevTools > Network tab
   // Set throttling to "Offline"
   // Navigate to /match?list=some-id
   // Expected: Orange error toast with retry button
   ```

2. **Test Validation Errors**
   ```javascript
   // Mock API to return 404
   // Expected: Yellow error toast with status code 404
   ```

3. **Test Server Errors**
   ```javascript
   // Mock API to return 500
   // Expected: Red error toast with server error message
   ```

4. **Test Error Recovery**
   ```javascript
   // 1. Trigger error
   // 2. Click "Retry" button
   // 3. Verify loading state appears
   // 4. Allow request to succeed
   // 5. Verify success state
   ```

See `useLoadingStateMachine.test.md` for comprehensive testing documentation.

---

## Integration with Existing Code

### Match Page Integration

The match page now uses the loading state machine for:

1. **List Loading**
   - Fetches list data from API
   - Categorizes errors (network, validation, server)
   - Provides retry functionality

2. **Backend Sync**
   - Syncs list items with backend
   - Handles sync failures gracefully
   - Allows retry without losing loaded data

3. **Backlog Initialization**
   - Loads backlog groups for category
   - Handles API failures
   - Provides category-specific retry actions

### Error Display Hierarchy

1. **LoadingErrorBoundary** (new) - State machine errors
2. **MatchErrorState** (existing) - React Query errors
3. **MatchLoadingState** (existing) - Loading UI
4. **MatchNoListState** (existing) - No list selected

---

## Future Enhancements

### 1. Error Telemetry
```typescript
// Track error occurrences
const trackError = (errorType: ErrorType, context: any) => {
  analytics.track('error_occurred', {
    errorType,
    timestamp: Date.now(),
    context
  });
};
```

### 2. Error Rate Limiting
```typescript
// Prevent excessive retries
const [retryCount, setRetryCount] = useState(0);
const MAX_RETRIES = 3;

const retryAction = () => {
  if (retryCount < MAX_RETRIES) {
    setRetryCount(prev => prev + 1);
    loadData();
  } else {
    showMaxRetriesError();
  }
};
```

### 3. Offline Queue
```typescript
// Queue failed requests for retry when online
const queueFailedRequest = (request: () => Promise<void>) => {
  offlineQueue.add(request);
};

window.addEventListener('online', () => {
  offlineQueue.processAll();
});
```

### 4. Error-specific Recovery Strategies
```typescript
// Different recovery strategies per error type
const getRecoveryStrategy = (errorType: ErrorType) => {
  switch (errorType) {
    case 'NETWORK':
      return retryWithBackoff;
    case 'VALIDATION':
      return promptUserInput;
    case 'SERVER':
      return retryAfterDelay;
    default:
      return defaultRetry;
  }
};
```

---

## Best Practices

1. **Always Provide Recovery Actions**
   - Every error should have a way to recover
   - Retry is the most common recovery action
   - Consider navigation or dismissal as alternatives

2. **Use Appropriate Error Types**
   - Network errors: Connection issues, timeouts
   - Validation errors: User input problems, permissions
   - Server errors: Backend failures
   - Unknown errors: Unexpected situations

3. **Include Technical Details**
   - Store full error details for debugging
   - Display user-friendly messages
   - Make details expandable for power users

4. **Test All Error Scenarios**
   - Network failures
   - API validation errors (4xx)
   - Server errors (5xx)
   - Unknown errors
   - Recovery flows

5. **Monitor Error Rates**
   - Track which errors occur most frequently
   - Prioritize UX improvements for common errors
   - Identify systemic issues early

---

## Support

For questions or issues:
- Review the test documentation: `useLoadingStateMachine.test.md`
- Check the implementation: `useLoadingStateMachine.ts`
- Examine the example: `src/app/match/page.tsx`

---

## Changelog

### v1.0.0 (2025-10-25)
- Initial implementation
- Core state machine with 4 states
- 4 error types with classification
- LoadingErrorBoundary component
- Integration with match page
- Comprehensive testing documentation
- Error recovery actions
- HTTP error categorization utilities
