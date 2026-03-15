/**
 * CircuitBreaker - Prevents cascading failures by tracking endpoint health
 *
 * Implements the circuit breaker pattern with three states:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Endpoint is failing, requests fail fast
 * - HALF_OPEN: Cooldown expired, one probe request allowed
 *
 * Tracks failures per endpoint group (e.g., /lists, /top/groups).
 * Only counts retriable errors (network, server, rate limit) toward the threshold.
 */

import { isGoatError } from '@/lib/errors';

// =============================================================================
// Types
// =============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Cooldown period in ms before half-open probe (default: 30000) */
  cooldownMs?: number;
  /** Window in ms to track failures - resets if no failure in this window (default: 60000) */
  failureWindowMs?: number;
}

export interface EndpointCircuit {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number;
  openedAt: number;
  successCount: number;
}

export interface CircuitBreakerStats {
  circuits: Record<string, EndpointCircuit & { endpoint: string }>;
  totalTrips: number;
  totalFastFails: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  failureWindowMs: 60_000,
};

// =============================================================================
// CircuitBreaker Class
// =============================================================================

export class CircuitBreaker {
  private circuits = new Map<string, EndpointCircuit>();
  private config: Required<CircuitBreakerConfig>;
  private totalTrips = 0;
  private totalFastFails = 0;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a request to the given endpoint is allowed.
   * Returns true if the request can proceed, false if the circuit is open.
   */
  canRequest(endpoint: string): boolean {
    const key = this.getEndpointKey(endpoint);
    const circuit = this.circuits.get(key);

    if (!circuit) return true;

    switch (circuit.state) {
      case 'CLOSED':
        return true;

      case 'OPEN': {
        const elapsed = Date.now() - circuit.openedAt;
        if (elapsed >= this.config.cooldownMs) {
          // Transition to half-open for probe
          circuit.state = 'HALF_OPEN';
          this.log(`⚡ Circuit HALF_OPEN for ${key} — allowing probe request`);
          return true;
        }
        this.totalFastFails++;
        return false;
      }

      case 'HALF_OPEN':
        // Only one probe at a time — block additional requests while probing
        return false;
    }
  }

  /**
   * Record a successful request. Resets the circuit to CLOSED.
   */
  recordSuccess(endpoint: string): void {
    const key = this.getEndpointKey(endpoint);
    const circuit = this.circuits.get(key);

    if (!circuit) return;

    if (circuit.state === 'HALF_OPEN') {
      this.log(`✅ Circuit CLOSED for ${key} — probe succeeded`);
    }

    circuit.state = 'CLOSED';
    circuit.failureCount = 0;
    circuit.successCount++;
  }

  /**
   * Record a failed request. Only retriable errors count toward the threshold.
   */
  recordFailure(endpoint: string, error: unknown): void {
    // Only count retriable errors (network, server, rate limit)
    if (isGoatError(error) && !error.isRetriable()) return;

    const key = this.getEndpointKey(endpoint);
    const now = Date.now();

    let circuit = this.circuits.get(key);
    if (!circuit) {
      circuit = {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureAt: 0,
        openedAt: 0,
        successCount: 0,
      };
      this.circuits.set(key, circuit);
    }

    // Reset failure count if outside the failure window
    if (now - circuit.lastFailureAt > this.config.failureWindowMs) {
      circuit.failureCount = 0;
    }

    circuit.failureCount++;
    circuit.lastFailureAt = now;

    if (circuit.state === 'HALF_OPEN') {
      // Probe failed — reopen
      circuit.state = 'OPEN';
      circuit.openedAt = now;
      this.totalTrips++;
      this.log(`🔴 Circuit re-OPENED for ${key} — probe failed`);
      return;
    }

    if (circuit.failureCount >= this.config.failureThreshold && circuit.state === 'CLOSED') {
      circuit.state = 'OPEN';
      circuit.openedAt = now;
      this.totalTrips++;
      this.log(
        `🔴 Circuit OPENED for ${key} — ${circuit.failureCount} consecutive failures`
      );
    }
  }

  /**
   * Get the current state of a circuit for a given endpoint.
   */
  getState(endpoint: string): CircuitState {
    const key = this.getEndpointKey(endpoint);
    const circuit = this.circuits.get(key);
    if (!circuit) return 'CLOSED';

    // Check if open circuit has cooled down
    if (circuit.state === 'OPEN') {
      const elapsed = Date.now() - circuit.openedAt;
      if (elapsed >= this.config.cooldownMs) {
        return 'HALF_OPEN';
      }
    }

    return circuit.state;
  }

  /**
   * Get stats for all tracked circuits.
   */
  getStats(): CircuitBreakerStats {
    const circuits: CircuitBreakerStats['circuits'] = {};
    const entries = Array.from(this.circuits.entries());
    for (const [key, circuit] of entries) {
      circuits[key] = { ...circuit, endpoint: key };
    }
    return {
      circuits,
      totalTrips: this.totalTrips,
      totalFastFails: this.totalFastFails,
    };
  }

  /**
   * Reset a specific circuit or all circuits.
   */
  reset(endpoint?: string): void {
    if (endpoint) {
      const key = this.getEndpointKey(endpoint);
      this.circuits.delete(key);
    } else {
      this.circuits.clear();
      this.totalTrips = 0;
      this.totalFastFails = 0;
    }
  }

  /**
   * Extract the endpoint group key from a full endpoint path.
   * Groups related endpoints together (e.g., /lists/123 → /lists).
   */
  private getEndpointKey(endpoint: string): string {
    // Strip query params
    const path = endpoint.split('?')[0];
    // Get first two path segments: /top/groups/123 → /top/groups, /lists/123 → /lists
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return '/';
    if (segments.length === 1) return `/${segments[0]}`;
    // Keep first two segments for nested APIs like /top/groups, /top/items
    return `/${segments[0]}/${segments[1]}`;
  }

  private log(message: string): void {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log(`[CircuitBreaker] ${message}`);
    }
  }
}

// =============================================================================
// Singleton & Exports
// =============================================================================

let globalCircuitBreaker: CircuitBreaker | null = null;

/**
 * Get the global CircuitBreaker instance
 */
export function getGlobalCircuitBreaker(): CircuitBreaker {
  if (!globalCircuitBreaker) {
    globalCircuitBreaker = new CircuitBreaker();
  }
  return globalCircuitBreaker;
}

/**
 * Reset the global CircuitBreaker (mainly for testing)
 */
export function resetGlobalCircuitBreaker(): void {
  if (globalCircuitBreaker) {
    globalCircuitBreaker.reset();
    globalCircuitBreaker = null;
  }
}
