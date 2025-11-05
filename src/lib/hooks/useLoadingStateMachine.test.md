# Loading State Machine Error Handling Tests

This document describes how to test the error handling scenarios for the loading state machine.

## Test Scenarios

### 1. Network Error Testing

**Simulate Network Failure:**
```typescript
// In your browser console or test file:
// Option 1: Disconnect network
// - Open DevTools > Network tab
// - Set throttling to "Offline"
// - Reload the match page with a list ID

// Option 2: Use fetch interceptor
const originalFetch = window.fetch;
window.fetch = function(...args) {
  return Promise.reject(new Error('Network request failed'));
};

// Navigate to: /match?list=some-list-id
// Expected: Orange "Network Error" toast appears with retry button
```

**Verify:**
- ✓ Error toast slides in from top
- ✓ Orange color scheme (network error)
- ✓ Network icon animates (pulsing)
- ✓ Message: "Unable to connect to the server. Please check your internet connection."
- ✓ Retry button is visible and functional
- ✓ Dismiss button closes the toast
- ✓ Clicking retry re-attempts the request

---

### 2. Validation Error Testing (4xx)

**Simulate 400 Bad Request:**
```typescript
// Mock API client to return 400 error
import { apiClient } from '@/lib/api/client';

// Store original method
const originalGet = apiClient.get.bind(apiClient);

// Override with error response
apiClient.get = async function(endpoint, params) {
  const error = new Error('Invalid request parameters') as any;
  error.status = 400;
  error.statusText = 'Bad Request';
  error.response = {
    status: 400,
    statusText: 'Bad Request',
    data: { detail: 'Category parameter is required' }
  };
  throw error;
};

// Navigate to: /match?list=invalid-list-id
// Expected: Yellow "Validation Error" toast with status code 400
```

**Simulate 404 Not Found:**
```typescript
apiClient.get = async function(endpoint, params) {
  const error = new Error('Resource not found') as any;
  error.status = 404;
  error.statusText = 'Not Found';
  error.response = {
    status: 404,
    statusText: 'Not Found',
    data: { detail: 'List not found' }
  };
  throw error;
};

// Expected: Yellow "Validation Error" toast
// Message: "The requested resource was not found."
```

**Verify:**
- ✓ Yellow color scheme (validation error)
- ✓ Alert icon with bounce animation
- ✓ Status code badge shows correct code (400, 404, etc.)
- ✓ Appropriate validation message displayed
- ✓ Retry button triggers recovery action
- ✓ Details section shows technical information

---

### 3. Server Error Testing (5xx)

**Simulate 500 Internal Server Error:**
```typescript
apiClient.get = async function(endpoint, params) {
  const error = new Error('Internal server error') as any;
  error.status = 500;
  error.statusText = 'Internal Server Error';
  error.response = {
    status: 500,
    statusText: 'Internal Server Error',
    data: { detail: 'Database connection failed' }
  };
  throw error;
};

// Navigate to: /match?list=some-list-id
// Expected: Red "Server Error" toast with status 500
```

**Simulate 503 Service Unavailable:**
```typescript
apiClient.get = async function(endpoint, params) {
  const error = new Error('Service unavailable') as any;
  error.status = 503;
  error.statusText = 'Service Unavailable';
  error.response = {
    status: 503,
    statusText: 'Service Unavailable',
    data: { detail: 'Server is temporarily unavailable' }
  };
  throw error;
};

// Expected: Red "Server Error" toast
// Message: "Service unavailable. Please try again later."
```

**Verify:**
- ✓ Red color scheme (server error)
- ✓ Server crash icon with pulse animation
- ✓ Status code badge shows 5xx code
- ✓ User-friendly server error message
- ✓ Retry functionality works
- ✓ Technical details available in expandable section

---

### 4. Unknown Error Testing

**Simulate Uncategorized Error:**
```typescript
apiClient.get = async function(endpoint, params) {
  throw new Error('Something went completely wrong');
};

// Navigate to: /match?list=some-list-id
// Expected: Gray "Unexpected Error" toast
```

**Verify:**
- ✓ Gray color scheme (unknown error)
- ✓ Help circle icon with pulse animation
- ✓ Generic error message displayed
- ✓ Full error details available in details section
- ✓ Retry button available if recovery action exists

---

## Integration Tests

### Test 1: Error Recovery Flow
```typescript
// 1. Trigger network error
// 2. Verify error toast appears
// 3. Click "Retry" button
// 4. Verify error toast dismisses
// 5. Verify loading state appears
// 6. Allow request to succeed
// 7. Verify success state and content loads
```

### Test 2: Multiple Sequential Errors
```typescript
// 1. Trigger validation error (404)
// 2. Dismiss error
// 3. Trigger server error (500)
// 4. Verify new error replaces old one
// 5. Verify correct error type and message
```

### Test 3: Backlog Initialization Error
```typescript
// 1. Navigate to match page with valid list
// 2. Mock itemGroupsApi.getGroupsByCategory to fail
// 3. Verify error toast appears for backlog loading
// 4. Click retry
// 5. Verify backlog re-initializes correctly
```

### Test 4: Sync Error Handling
```typescript
// 1. Load list successfully
// 2. Mock syncWithBackend to fail with network error
// 3. Verify error toast appears
// 4. Verify list data is still loaded (partial success)
// 5. Click retry to complete sync
```

---

## Manual Testing Checklist

### Visual Tests
- [ ] Error toast slides in smoothly from top
- [ ] Correct color scheme for each error type
- [ ] Icons animate appropriately (pulse/bounce)
- [ ] Text is readable on all backgrounds
- [ ] Buttons have hover/active states
- [ ] Toast is centered horizontally
- [ ] Toast is responsive on mobile devices

### Functional Tests
- [ ] Retry button calls recovery action
- [ ] Dismiss button closes toast
- [ ] Show/Hide Details toggle works
- [ ] Details section expands/collapses smoothly
- [ ] Multiple errors don't stack (latest replaces previous)
- [ ] Error persists until dismissed or retry succeeds
- [ ] Timestamp shows correct error occurrence time

### Accessibility Tests
- [ ] Close button has aria-label
- [ ] Error message is readable by screen readers
- [ ] Focus management works correctly
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Color contrast meets WCAG standards

---

## Error State Machine Flow

```
IDLE
  ↓
START_LOADING → LOADING
  ↓
  ├─→ SET_SUCCESS → SUCCESS
  ├─→ SET_NETWORK_ERROR → ERROR (Network)
  ├─→ SET_VALIDATION_ERROR → ERROR (Validation)
  ├─→ SET_SERVER_ERROR → ERROR (Server)
  └─→ SET_UNKNOWN_ERROR → ERROR (Unknown)

ERROR
  ├─→ RESET → IDLE
  └─→ Recovery Action → LOADING (retry)
```

---

## Browser Console Testing Commands

### Quick Test Suite
```javascript
// Copy-paste into browser console for quick testing

// Test Network Error
window.testNetworkError = () => {
  const event = new CustomEvent('test-error', {
    detail: { type: 'network' }
  });
  window.dispatchEvent(event);
};

// Test Validation Error
window.testValidationError = () => {
  const event = new CustomEvent('test-error', {
    detail: { type: 'validation', statusCode: 404 }
  });
  window.dispatchEvent(event);
};

// Test Server Error
window.testServerError = () => {
  const event = new CustomEvent('test-error', {
    detail: { type: 'server', statusCode: 500 }
  });
  window.dispatchEvent(event);
};

// Run tests
console.log('Error testing commands available:');
console.log('- testNetworkError()');
console.log('- testValidationError()');
console.log('- testServerError()');
```

---

## Production Monitoring

### Error Telemetry Data Points to Track
1. **Error Frequency**
   - Count of each error type per session
   - Most common error messages
   - Error occurrence patterns (time of day, user actions)

2. **Recovery Metrics**
   - Retry success rate per error type
   - Average retries before success
   - User dismissal rate vs retry rate

3. **Performance Impact**
   - Time to error detection
   - Time to error resolution (user action)
   - Impact on user session duration

4. **User Experience**
   - Error message clarity (user feedback)
   - Recovery action effectiveness
   - Error-to-success conversion rate

---

## Next Steps: Error Telemetry Implementation

To implement production error tracking, add:

```typescript
// In useLoadingStateMachine.ts
import { trackError } from '@/lib/analytics';

// In error action creators:
const setNetworkError = useCallback((message, recoveryAction, details) => {
  // Track error occurrence
  trackError('network_error', {
    message,
    timestamp: Date.now(),
    hasRecoveryAction: !!recoveryAction,
    details
  });

  dispatch({
    type: 'SET_NETWORK_ERROR',
    payload: { message, recoveryAction, details }
  });
}, []);

// Track recovery attempts
const handleRetry = () => {
  trackEvent('error_retry', {
    errorType: state.errorType,
    timestamp: Date.now()
  });

  if (state.recoveryAction) {
    state.recoveryAction();
  }
};
```

This will provide data-driven insights into which errors are most problematic for users.
