# Loading State Machine - Error Handling Test Scenarios

## Overview
This document outlines test scenarios for the comprehensive error handling system implemented in the loading state machine.

## Test Scenarios

### 1. Network Errors

#### 1.1 Network Timeout
**Trigger:** API request exceeds timeout limit
**Expected Behavior:**
- Error type: `NETWORK`
- Message: "Network request timed out. Please check your connection."
- Recovery action: Retry the failed request
- UI: Orange/red gradient banner with pulsing WifiOff icon

**Test Steps:**
1. Start a list load operation
2. Simulate slow network (Chrome DevTools > Network > Slow 3G)
3. Observe error banner appears after timeout
4. Click "Retry" button
5. Verify request is attempted again

#### 1.2 Network Disconnection
**Trigger:** Complete loss of internet connection
**Expected Behavior:**
- Error type: `NETWORK`
- Message: "Unable to connect to the server. Please check your internet connection."
- Recovery action: Retry the failed request
- UI: Orange/red gradient banner with pulsing WifiOff icon

**Test Steps:**
1. Disconnect from internet
2. Navigate to `/match?list={listId}`
3. Observe network error banner
4. Reconnect internet
5. Click "Retry" button
6. Verify successful load

### 2. Validation Errors (4xx)

#### 2.1 Not Found (404)
**Trigger:** Request non-existent list ID
**Expected Behavior:**
- Error type: `VALIDATION`
- Status code: 404
- Message: "The requested resource was not found."
- Recovery action: Navigate back to home
- UI: Yellow/orange gradient banner with bouncing AlertCircle icon

**Test Steps:**
1. Navigate to `/match?list=non-existent-id`
2. Observe validation error banner
3. Verify status code badge shows "404"
4. Click "Dismiss" to close banner
5. Verify navigation suggestion

#### 2.2 Unauthorized (401)
**Trigger:** API request without authentication
**Expected Behavior:**
- Error type: `VALIDATION`
- Status code: 401
- Message: "Authentication required. Please sign in."
- UI: Yellow/orange gradient banner with bouncing AlertCircle icon

**Test Steps:**
1. Clear authentication tokens
2. Attempt to load a list
3. Observe authentication error
4. Verify redirect to sign-in page (if implemented)

#### 2.3 Forbidden (403)
**Trigger:** Request access to unauthorized resource
**Expected Behavior:**
- Error type: `VALIDATION`
- Status code: 403
- Message: "You do not have permission to access this resource."
- UI: Yellow/orange gradient banner

#### 2.4 Validation Failed (422)
**Trigger:** Send invalid data to API
**Expected Behavior:**
- Error type: `VALIDATION`
- Status code: 422
- Message: "Validation failed. Please check your input."
- Details: Specific validation errors from API

#### 2.5 Rate Limiting (429)
**Trigger:** Exceed API rate limits
**Expected Behavior:**
- Error type: `VALIDATION`
- Status code: 429
- Message: "Too many requests. Please try again later."
- Recovery action: Retry after delay

### 3. Server Errors (5xx)

#### 3.1 Internal Server Error (500)
**Trigger:** Backend server crashes or throws exception
**Expected Behavior:**
- Error type: `SERVER`
- Status code: 500
- Message: "Internal server error. Please try again later."
- Recovery action: Retry with exponential backoff
- UI: Red/pink gradient banner with pulsing ServerCrash icon

**Test Steps:**
1. Configure backend to return 500 error
2. Attempt to load list
3. Observe server error banner
4. Click "Retry" button
5. Verify retry attempt with delay

#### 3.2 Bad Gateway (502)
**Trigger:** Gateway or proxy server receives invalid response
**Expected Behavior:**
- Error type: `SERVER`
- Status code: 502
- Message: "Bad gateway. The server is temporarily unavailable."
- UI: Red/pink gradient banner

#### 3.3 Service Unavailable (503)
**Trigger:** Server is temporarily unable to handle requests
**Expected Behavior:**
- Error type: `SERVER`
- Status code: 503
- Message: "Service unavailable. Please try again later."
- Recovery action: Retry with delay

#### 3.4 Gateway Timeout (504)
**Trigger:** Gateway timeout waiting for upstream server
**Expected Behavior:**
- Error type: `SERVER`
- Status code: 504
- Message: "Gateway timeout. The server took too long to respond."

### 4. Unknown Errors

#### 4.1 Unexpected Error
**Trigger:** JavaScript exception or unhandled error
**Expected Behavior:**
- Error type: `UNKNOWN`
- Message: "An unexpected error occurred. Please try again."
- Details: Full error object as JSON
- UI: Gray gradient banner with pulsing HelpCircle icon

**Test Steps:**
1. Introduce a runtime error in the code
2. Trigger the error condition
3. Observe unknown error banner
4. Click "Show Details" to view technical information
5. Verify details contain error stack trace

### 5. Error Recovery

#### 5.1 Successful Retry
**Test Steps:**
1. Trigger any network error
2. Fix the underlying issue (e.g., reconnect internet)
3. Click "Retry" button
4. Verify loading state transitions: ERROR → LOADING → SUCCESS
5. Verify error banner dismisses automatically

#### 5.2 Failed Retry
**Test Steps:**
1. Trigger network error
2. Keep network disconnected
3. Click "Retry" button
4. Verify new error banner appears
5. Verify retry action still available

#### 5.3 Manual Dismiss
**Test Steps:**
1. Trigger any error
2. Click "Dismiss" button
3. Verify banner slides out with smooth animation
4. Verify state resets to IDLE

### 6. Multiple Errors

#### 6.1 Sequential Errors
**Test Steps:**
1. Trigger initial list load error
2. Let it display
3. Trigger backlog initialization error
4. Verify only the latest error is shown
5. Verify previous error is replaced smoothly

### 7. Error Details

#### 7.1 Show/Hide Technical Details
**Test Steps:**
1. Trigger any error with details
2. Verify "Show Details" button is visible
3. Click "Show Details"
4. Verify technical details expand with animation
5. Verify details are displayed in monospace font
6. Click "Hide Details"
7. Verify details collapse smoothly

#### 7.2 Error Timestamp
**Test Steps:**
1. Trigger error
2. Verify timestamp is displayed at bottom of banner
3. Verify timestamp format is readable (localized)

### 8. UI/UX Elements

#### 8.1 Animations
**Test:**
- Banner slides in from top when error occurs
- Banner slides out when dismissed
- Icon animations (pulse for network/server, bounce for validation)
- Smooth transitions between show/hide details
- Button hover and click states

#### 8.2 Color Coding
**Verify:**
- Network errors: Orange/red gradient
- Validation errors: Yellow/orange gradient
- Server errors: Red/pink gradient
- Unknown errors: Gray gradient

#### 8.3 Accessibility
**Test:**
- Keyboard navigation (Tab through buttons)
- Focus states visible
- ARIA labels present
- Error messages are clear and actionable
- Screen reader compatibility

## Manual Testing Script

```javascript
// Run in browser console to simulate errors

// Simulate network error
const simulateNetworkError = () => {
  const error = new Error('Failed to fetch');
  error.name = 'TypeError';
  throw error;
};

// Simulate 404 error
const simulate404 = () => {
  const error = new Error('Not Found');
  error.status = 404;
  error.statusText = 'Not Found';
  error.response = { status: 404, statusText: 'Not Found', data: {} };
  throw error;
};

// Simulate 500 error
const simulate500 = () => {
  const error = new Error('Internal Server Error');
  error.status = 500;
  error.statusText = 'Internal Server Error';
  error.response = {
    status: 500,
    statusText: 'Internal Server Error',
    data: { detail: 'Database connection failed' }
  };
  throw error;
};
```

## Expected Outcomes

### Success Criteria
- ✅ All error types correctly categorized
- ✅ User-friendly error messages displayed
- ✅ Appropriate UI styling per error type
- ✅ Recovery actions work correctly
- ✅ State transitions are clean (no flashing)
- ✅ Technical details available when needed
- ✅ Animations are smooth and performant
- ✅ No console errors during error handling

### Performance Criteria
- Banner appears within 100ms of error
- Animations complete in < 300ms
- No memory leaks from error state
- Recovery actions don't cause race conditions

## Regression Testing

After any changes to error handling, verify:
1. Existing error scenarios still work
2. No breaking changes to state machine
3. Recovery actions still functional
4. UI remains consistent across error types
5. TypeScript types remain accurate

## Error Telemetry (Future Enhancement)

Consider tracking:
- Error frequency by type
- Most common error messages
- Recovery action success rate
- Time to error resolution
- User actions after error (retry, dismiss, navigate away)
