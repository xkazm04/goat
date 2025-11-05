/**
 * Error Simulator Utility
 *
 * This utility helps test error handling by simulating various error scenarios.
 * Use it during development to test the loading state machine error handling.
 *
 * ⚠️ WARNING: This should only be used in development/testing environments!
 */

export interface ErrorSimulatorConfig {
  enabled: boolean;
  errorType?: 'network' | 'validation' | 'server' | 'unknown';
  statusCode?: number;
  delay?: number;
  message?: string;
}

class ErrorSimulator {
  private config: ErrorSimulatorConfig = {
    enabled: false
  };

  /**
   * Enable error simulation
   */
  enable(config: Partial<ErrorSimulatorConfig> = {}) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Error simulator should not be enabled in production!');
      return;
    }

    this.config = {
      enabled: true,
      ...config
    };

    console.log('🧪 Error simulator enabled:', this.config);
  }

  /**
   * Disable error simulation
   */
  disable() {
    this.config.enabled = false;
    console.log('✅ Error simulator disabled');
  }

  /**
   * Check if error simulation is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && process.env.NODE_ENV !== 'production';
  }

  /**
   * Simulate an error based on configuration
   */
  async simulateError(): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    // Add delay if configured
    if (this.config.delay) {
      await new Promise(resolve => setTimeout(resolve, this.config.delay));
    }

    switch (this.config.errorType) {
      case 'network':
        throw this.createNetworkError();
      case 'validation':
        throw this.createValidationError(this.config.statusCode || 404);
      case 'server':
        throw this.createServerError(this.config.statusCode || 500);
      case 'unknown':
        throw this.createUnknownError();
      default:
        // Random error if not specified
        throw this.createRandomError();
    }
  }

  /**
   * Wrap an async function with error simulation
   */
  wrapAsync<T>(fn: () => Promise<T>): () => Promise<T> {
    return async () => {
      if (this.isEnabled()) {
        await this.simulateError();
      }
      return fn();
    };
  }

  // Error factory methods

  private createNetworkError(): Error {
    const messages = [
      'Failed to fetch',
      'Network request failed',
      'Connection timeout',
      'NetworkError when attempting to fetch resource'
    ];

    const error: any = new Error(
      this.config.message || messages[Math.floor(Math.random() * messages.length)]
    );
    error.name = 'TypeError';
    return error;
  }

  private createValidationError(statusCode: number = 404): Error {
    const errorMap: Record<number, { message: string; detail?: string }> = {
      400: {
        message: 'Bad Request',
        detail: 'Invalid request parameters'
      },
      401: {
        message: 'Unauthorized',
        detail: 'Authentication required'
      },
      403: {
        message: 'Forbidden',
        detail: 'You do not have permission to access this resource'
      },
      404: {
        message: 'Not Found',
        detail: 'The requested resource was not found'
      },
      409: {
        message: 'Conflict',
        detail: 'The resource has been modified by another user'
      },
      422: {
        message: 'Unprocessable Entity',
        detail: 'Validation failed: invalid input data'
      },
      429: {
        message: 'Too Many Requests',
        detail: 'Rate limit exceeded. Please try again later'
      }
    };

    const errorInfo = errorMap[statusCode] || errorMap[404];
    const error: any = new Error(
      this.config.message || errorInfo.message
    );

    error.status = statusCode;
    error.statusText = errorInfo.message;
    error.response = {
      status: statusCode,
      statusText: errorInfo.message,
      data: {
        detail: errorInfo.detail
      }
    };

    return error;
  }

  private createServerError(statusCode: number = 500): Error {
    const errorMap: Record<number, { message: string; detail?: string }> = {
      500: {
        message: 'Internal Server Error',
        detail: 'An unexpected error occurred on the server'
      },
      502: {
        message: 'Bad Gateway',
        detail: 'Invalid response from upstream server'
      },
      503: {
        message: 'Service Unavailable',
        detail: 'The server is temporarily unable to handle the request'
      },
      504: {
        message: 'Gateway Timeout',
        detail: 'The server took too long to respond'
      }
    };

    const errorInfo = errorMap[statusCode] || errorMap[500];
    const error: any = new Error(
      this.config.message || errorInfo.message
    );

    error.status = statusCode;
    error.statusText = errorInfo.message;
    error.response = {
      status: statusCode,
      statusText: errorInfo.message,
      data: {
        detail: errorInfo.detail,
        trace_id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    };

    return error;
  }

  private createUnknownError(): Error {
    const messages = [
      'Something went wrong',
      'Unexpected error occurred',
      'Unknown error',
      'An error occurred while processing your request'
    ];

    return new Error(
      this.config.message || messages[Math.floor(Math.random() * messages.length)]
    );
  }

  private createRandomError(): Error {
    const types = ['network', 'validation', 'server', 'unknown'];
    const type = types[Math.floor(Math.random() * types.length)];

    this.config.errorType = type as any;

    switch (type) {
      case 'network':
        return this.createNetworkError();
      case 'validation':
        return this.createValidationError();
      case 'server':
        return this.createServerError();
      default:
        return this.createUnknownError();
    }
  }
}

// Export singleton instance
export const errorSimulator = new ErrorSimulator();

// Export convenience functions
export const enableErrorSimulator = (config?: Partial<ErrorSimulatorConfig>) => {
  errorSimulator.enable(config);
};

export const disableErrorSimulator = () => {
  errorSimulator.disable();
};

// Browser console helpers (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as any).__errorSimulator = {
    enable: enableErrorSimulator,
    disable: disableErrorSimulator,

    // Quick presets
    simulateNetwork: () => enableErrorSimulator({ errorType: 'network' }),
    simulate404: () => enableErrorSimulator({ errorType: 'validation', statusCode: 404 }),
    simulate500: () => enableErrorSimulator({ errorType: 'server', statusCode: 500 }),
    simulate503: () => enableErrorSimulator({ errorType: 'server', statusCode: 503 }),
    simulateUnknown: () => enableErrorSimulator({ errorType: 'unknown' }),

    // With delay
    simulateSlowNetwork: () => enableErrorSimulator({ errorType: 'network', delay: 3000 }),
    simulateTimeout: () => enableErrorSimulator({
      errorType: 'network',
      delay: 5000,
      message: 'Request timeout'
    }),
  };

  console.log(`
🧪 Error Simulator Available!

Use these commands in the browser console:

__errorSimulator.simulateNetwork()     - Simulate network error
__errorSimulator.simulate404()         - Simulate 404 Not Found
__errorSimulator.simulate500()         - Simulate 500 Server Error
__errorSimulator.simulate503()         - Simulate 503 Service Unavailable
__errorSimulator.simulateUnknown()     - Simulate unknown error
__errorSimulator.simulateSlowNetwork() - Simulate slow network (3s delay)
__errorSimulator.simulateTimeout()     - Simulate timeout (5s delay)

__errorSimulator.enable({
  errorType: 'validation',
  statusCode: 422,
  delay: 1000,
  message: 'Custom error message'
})

__errorSimulator.disable()             - Disable error simulation

⚠️ Note: Refresh the page after enabling simulation
  `);
}

// Example usage in API clients:
//
// import { errorSimulator } from '@/lib/utils/error-simulator';
//
// async function fetchData() {
//   await errorSimulator.simulateError(); // Will throw if enabled
//   return apiClient.get('/data');
// }
