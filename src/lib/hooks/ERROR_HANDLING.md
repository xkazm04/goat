# Error Handling System Documentation

## Overview

This project implements a comprehensive error handling system using a state machine pattern. The system categorizes errors, provides user-friendly messages, supports recovery actions, and displays elegant error UI.

## Architecture

### 1. Loading State Machine (`useLoadingStateMachine.ts`)

The core of the error handling system is a state machine that manages loading, success, and error states.

#### State Types

```typescript
type LoadingStateType = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

type ErrorType = 'NETWORK' | 'VALIDATION' | 'SERVER' | 'UNKNOWN';

interface ErrorMetadata {
  errorType: ErrorType;
  message: string;
  recoveryAction?: () => void;
  timestamp: number;
  statusCode?: number;
  details?: string;
}

type LoadingState =
  | { type: 'IDLE' }
  | { type: 'LOADING'; progress?: number }
  | { type: 'SUCCESS'; data?: any }
  | { type: 'ERROR' } & ErrorMetadata;
```

#### Actions

The state machine supports the following actions:

- `START_LOADING` - Transition to loading state
- `SET_SUCCESS` - Transition to success state with optional data
- `SET_NETWORK_ERROR` - Set network error state
- `SET_VALIDATION_ERROR` - Set validation error state (4xx)
- `SET_SERVER_ERROR` - Set server error state (5xx)
- `SET_UNKNOWN_ERROR` - Set unknown error state
- `UPDATE_PROGRESS` - Update loading progress
- `RESET` - Reset to idle state

### 2. Error Categorization (`categorizeHttpError`)

The `categorizeHttpError` utility function automatically categorizes errors based on:

- **Network Errors**: Timeouts, connection failures, fetch failures
- **Validation Errors (4xx)**: 400, 401, 403, 404, 409, 422, 429
- **Server Errors (5xx)**: 500, 502, 503, 504
- **Unknown Errors**: Any other errors

```typescript
const { errorType, statusCode, message, details } = categorizeHttpError(error);
```

### 3. Error UI Component (`LoadingErrorBoundary.tsx`)

A visually appealing error banner component that:

- Slides in from the top when an error occurs
- Displays error type-specific icons and colors
- Shows user-friendly error messages
- Provides recovery actions (Retry, Dismiss)
- Supports showing/hiding technical details
- Animates icons based on error type

#### Error Type Styling

| Error Type | Color | Icon | Animation |
|------------|-------|------|-----------|
| NETWORK | Orange/Red | WifiOff | Pulse |
| VALIDATION | Yellow/Orange | AlertCircle | Bounce |
| SERVER | Red/Pink | ServerCrash | Pulse |
| UNKNOWN | Gray | HelpCircle | Pulse |

## Usage

### Basic Usage

```typescript
import { useLoadingStateMachine } from '@/lib/hooks/useLoadingStateMachine';

function MyComponent() {
  const {
    state,
    startLoading,
    setSuccess,
    setNetworkError,
    setValidationError,
    setServerError,
    setUnknownError,
    reset
  } = useLoadingStateMachine();

  const loadData = async () => {
    try {
      startLoading();
      const data = await fetchData();
      setSuccess(data);
    } catch (error) {
      const { errorType, message, statusCode, details } = categorizeHttpError(error);

      const retryAction = createRetryRecoveryAction(
        async () => await loadData(),
        () => reset()
      );

      switch (errorType) {
        case 'NETWORK':
          setNetworkError(message, retryAction, details);
          break;
        case 'VALIDATION':
          setValidationError(message, retryAction, statusCode, details);
          break;
        case 'SERVER':
          setServerError(message, retryAction, statusCode, details);
          break;
        default:
          setUnknownError(message, retryAction, details);
      }
    }
  };

  return (
    <>
      <LoadingErrorBoundary state={state} onDismiss={reset} />
      {/* Your component content */}
    </>
  );
}
```

### With Recovery Actions

Recovery actions allow users to retry failed operations:

```typescript
import { createRetryRecoveryAction } from '@/lib/hooks/useLoadingStateMachine';

const retryAction = createRetryRecoveryAction(
  async () => {
    // The original action to retry
    await fetchData();
  },
  () => {
    // Optional callback before retry
    reset();
  }
);

setNetworkError('Connection failed', retryAction, 'Network timeout');
```

### API Integration

The API client (`src/lib/api/client.ts`) automatically creates structured errors:

```typescript
// Network errors
const networkError = new Error('Failed to connect to server');
networkError.name = 'NetworkError';

// HTTP errors
const httpError = new Error('HTTP error! status: 404');
httpError.status = 404;
httpError.statusText = 'Not Found';
httpError.response = {
  status: 404,
  statusText: 'Not Found',
  data: { detail: 'Resource not found' }
};
```

## Error Messages

### Network Errors
- "Network request timed out. Please check your connection."
- "Unable to connect to the server. Please check your internet connection."

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
- "An unexpected error occurred. Please try again."

## Testing

### Manual Testing

Use the error simulator for testing:

```typescript
import { enableErrorSimulator } from '@/lib/utils/error-simulator';

// In browser console:
__errorSimulator.simulate404();
__errorSimulator.simulateNetwork();
__errorSimulator.simulate500();
```

### Test Scenarios

See `useLoadingStateMachine.test-scenarios.md` for comprehensive test scenarios including:
- Network errors (timeout, disconnection)
- Validation errors (401, 403, 404, 422, 429)
- Server errors (500, 502, 503, 504)
- Unknown errors
- Error recovery
- Multiple errors
- UI/UX testing

## Best Practices

### 1. Always Categorize Errors

```typescript
// ✅ Good
const { errorType, message, statusCode, details } = categorizeHttpError(error);
setNetworkError(message, retryAction, details);

// ❌ Bad
setNetworkError('Error occurred');
```

### 2. Provide Recovery Actions

```typescript
// ✅ Good
const retryAction = createRetryRecoveryAction(
  async () => await fetchData(),
  () => reset()
);
setNetworkError(message, retryAction, details);

// ❌ Bad (no way to recover)
setNetworkError(message);
```

### 3. Include Technical Details

```typescript
// ✅ Good
setServerError(
  'Failed to load list',
  retryAction,
  500,
  error.response?.data?.detail || error.message
);

// ❌ Bad (no debugging information)
setServerError('Failed to load list');
```

### 4. Reset State After Success

```typescript
// ✅ Good
try {
  startLoading();
  const data = await fetchData();
  setSuccess(data);
  reset(); // Clear any previous errors
} catch (error) {
  // Handle error
}
```

### 5. Use Appropriate Error Types

```typescript
// ✅ Good - Use categorizeHttpError
const { errorType, message } = categorizeHttpError(error);

// ❌ Bad - Manual categorization prone to errors
if (error.status === 404) {
  setValidationError('Not found');
} else if (error.status === 500) {
  setServerError('Server error');
}
```

## Advanced Features

### Progress Tracking

```typescript
startLoading(0); // Start at 0%

// Update progress
updateProgress(25); // 25% complete
updateProgress(50); // 50% complete
updateProgress(100); // 100% complete

setSuccess(data);
```

### Conditional Error Display

```typescript
// Only show error boundary for state machine errors
<LoadingErrorBoundary state={state} onDismiss={reset} />

// Show custom error UI for specific errors
{state.type === 'ERROR' && state.errorType === 'VALIDATION' && (
  <CustomValidationErrorUI error={state} />
)}
```

### Error Telemetry (Future Enhancement)

```typescript
// Track error metrics
useEffect(() => {
  if (state.type === 'ERROR') {
    logErrorToTelemetry({
      errorType: state.errorType,
      message: state.message,
      statusCode: state.statusCode,
      timestamp: state.timestamp,
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }
}, [state]);
```

## Implementation Checklist

When implementing error handling in a new component:

- [ ] Import `useLoadingStateMachine` hook
- [ ] Import `categorizeHttpError` utility
- [ ] Import `createRetryRecoveryAction` utility
- [ ] Wrap async operations in try-catch blocks
- [ ] Categorize errors using `categorizeHttpError`
- [ ] Create recovery actions for retryable errors
- [ ] Call appropriate error setter based on error type
- [ ] Add `<LoadingErrorBoundary>` component to UI
- [ ] Test all error scenarios
- [ ] Verify error messages are user-friendly
- [ ] Ensure recovery actions work correctly

## Common Pitfalls

### 1. Not Resetting State

```typescript
// ❌ Bad - Error persists after successful retry
const retryAction = async () => {
  await fetchData();
  setSuccess(data);
};

// ✅ Good - Reset clears error state first
const retryAction = createRetryRecoveryAction(
  async () => await fetchData(),
  () => reset()
);
```

### 2. Losing Error Context

```typescript
// ❌ Bad - Generic error message
catch (error) {
  setNetworkError('An error occurred');
}

// ✅ Good - Preserve error details
catch (error) {
  const { errorType, message, statusCode, details } = categorizeHttpError(error);
  setNetworkError(message, retryAction, details);
}
```

### 3. Blocking UI Without Recovery

```typescript
// ❌ Bad - User stuck with error
setServerError('Server unavailable');

// ✅ Good - User can retry or dismiss
setServerError('Server unavailable', retryAction);
```

### 4. Silent Failures

```typescript
// ❌ Bad - Error ignored
catch (error) {
  console.error(error);
}

// ✅ Good - User notified
catch (error) {
  const { errorType, message } = categorizeHttpError(error);
  setUnknownError(message);
}
```

## Future Enhancements

### Planned Features

1. **Error Telemetry**
   - Track error frequency by type
   - Monitor recovery success rates
   - Identify most common errors
   - Performance metrics

2. **Smart Retry Logic**
   - Exponential backoff
   - Circuit breaker pattern
   - Retry quotas per error type
   - Automatic retry for transient errors

3. **Error Analytics Dashboard**
   - Visualize error trends
   - Filter by error type
   - User impact analysis
   - Resolution time tracking

4. **Contextual Help**
   - "Learn More" links for common errors
   - In-app documentation
   - FAQ integration
   - Support ticket creation

5. **Offline Support**
   - Queue failed requests
   - Automatic retry when online
   - Offline indicator
   - Sync status display

## Troubleshooting

### Error banner not showing

1. Check that `LoadingErrorBoundary` is rendered
2. Verify state is being updated correctly
3. Check browser console for errors
4. Ensure framer-motion is installed

### Recovery action not working

1. Verify recovery action is passed to error setter
2. Check that reset() is called before retry
3. Ensure async operations are properly awaited
3. Check console for errors during retry

### Error messages not user-friendly

1. Use `categorizeHttpError` utility
2. Provide custom messages when appropriate
3. Test all error scenarios
4. Review error message guidelines

### Multiple error banners

1. Only render one `LoadingErrorBoundary`
2. Ensure state is properly reset
3. Check for multiple state machines
4. Use state.timestamp to track latest error

## Support

For questions or issues:
1. Check this documentation
2. Review test scenarios
3. Use error simulator for testing
4. Check browser console for errors
5. Review implementation examples

## References

- State machine pattern: https://xstate.js.org/docs/
- Error handling best practices: https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
- Framer Motion: https://www.framer.com/motion/
- Lucide Icons: https://lucide.dev/
