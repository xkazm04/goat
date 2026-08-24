/**
 * CircuitBreaker - Prevents cascading failures by tracking endpoint health
 *
 * Implements the circuit breaker pattern with three states:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Endpoint is failing, requests fail fast
 * - HALF_OPEN: Cooldown expired, probe request allowed + queued waiters
 *
 * Tracks failures per endpoint group (e.g., /lists, /top/groups).
 * Only counts retriable errors (network, server, rate limit) toward the threshold.
 *
 * In HALF_OPEN state, the first request acts as the probe. Concurrent requests
 * are queued and resolved once the probe succeeds or fails, rather than failing fast.
 */

import { isGoatError } from '@/lib/errors';

// =============================================================================
// Types
// =============================================================================

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/** Data emitted on circuit state transitions */
export interface CircuitStateChangeEvent {
  endpoint: string;
  previousState: CircuitState;
  newState: CircuitState;
  failureCount: number;
  timestamp: number;
}

/** Callback fired on circuit state transitions (production-safe, no console.log) */
export type CircuitStateChangeCallback = (event: CircuitStateChangeEvent) => void;

/**
 * Strategy for grouping endpoints into circuit breaker buckets.
 *
 * - `'path-prefix'` (default): Groups by the full path up to the first
 *   dynamic segment (UUID, numeric ID). For example:
 *     - `/api/lists/abc-123` -> `/api/lists`
 *     - `/api/top/groups/456/items` -> `/api/top/groups`
 *     - `/api/top/items` -> `/api/top/items`
 *   This keeps `/api/top/groups` and `/api/top/items` as separate circuits,
 *   avoiding a single failing endpoint (e.g. groups) from blocking a healthy
 *   one (e.g. items).
 *
 * - `'first-two-segments'`: Legacy behavior -- groups by the first two path
 *   segments only. `/api/top/groups` and `/api/top/items` share one circuit.
 *
 * - Custom function: Receives the endpoint path (without query params) and
 *   returns the grouping key string.
 */
export type GroupingStrategy =
  | 'path-prefix'
  | 'first-two-segments'
  | ((endpoint: string) => string);

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Cooldown period in ms before half-open probe (default: 30000) */
  cooldownMs?: number;
  /** Window in ms to track failures - resets if no failure in this window (default: 60000) */
  failureWindowMs?: number;
  /** Max requests to queue during HALF_OPEN waiting for probe (default: 10) */
  halfOpenQueueSize?: number;
  /** Optional callback fired on state transitions (production-safe) */
  onStateChange?: CircuitStateChangeCallback;
  /**
   * How endpoints are grouped into circuit breaker buckets (default: 'path-prefix').
   * See `GroupingStrategy` type for details.
   */
  groupingStrategy?: GroupingStrategy;
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

/** Internal resolved config type: all fields required except optional callbacks */
type ResolvedConfig = Required<Omit<CircuitBreakerConfig, 'onStateChange'>> & Pick<CircuitBreakerConfig, 'onStateChange'>;

const DEFAULT_CONFIG: ResolvedConfig = {
  failureThreshold: 10,
  cooldownMs: 60_000,
  failureWindowMs: 120_000,
  halfOpenQueueSize: 10,
  groupingStrategy: 'path-prefix',
};

// =============================================================================
// CircuitBreaker Class
// =============================================================================

export class CircuitBreaker {
  private circuits = new Map<string, EndpointCircuit>();
  private config: ResolvedConfig;
  private totalTrips = 0;
  private totalFastFails = 0;
  /** Tracks whether a probe request is currently in-flight per endpoint key */
  private probeInFlight = new Map<string, boolean>();
  /** Queued waiters per endpoint key during HALF_OPEN state */
  private halfOpenQueue = new Map<string, Array<{
    resolve: (allowed: boolean) => void;
  }>>();

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
          this.probeInFlight.set(key, true);
          this.emitStateChange(key, 'OPEN', 'HALF_OPEN', circuit.failureCount);
          this.log(`⚡ Circuit HALF_OPEN for ${key} — allowing probe request`);
          return true;
        }
        this.totalFastFails++;
        return false;
      }

      case 'HALF_OPEN':
        // Probe is the first request that transitioned us; it's already allowed.
        // Additional sync callers get false (they should use waitForProbe instead).
        return false;
    }
  }

  /**
   * Wait for the HALF_OPEN probe to complete instead of failing fast.
   * Returns true if the probe succeeded (caller can proceed), false if probe failed.
   * Falls back to false if the queue is full.
   */
  waitForProbe(endpoint: string): Promise<boolean> {
    const key = this.getEndpointKey(endpoint);
    const circuit = this.circuits.get(key);

    // Not in HALF_OPEN or no probe in flight — don't wait
    if (!circuit || circuit.state !== 'HALF_OPEN' || !this.probeInFlight.get(key)) {
      return Promise.resolve(false);
    }

    const queue = this.halfOpenQueue.get(key) || [];

    // Enforce queue size limit
    if (queue.length >= this.config.halfOpenQueueSize) {
      this.totalFastFails++;
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      queue.push({ resolve });
      this.halfOpenQueue.set(key, queue);
    });
  }

  /**
   * Record a successful request. Resets the circuit to CLOSED.
   * Resolves any queued HALF_OPEN waiters.
   */
  recordSuccess(endpoint: string): void {
    const key = this.getEndpointKey(endpoint);
    const circuit = this.circuits.get(key);

    if (!circuit) return;

    if (circuit.state === 'HALF_OPEN') {
      this.emitStateChange(key, 'HALF_OPEN', 'CLOSED', circuit.failureCount);
      this.log(`✅ Circuit CLOSED for ${key} — probe succeeded`);
      // Resolve queued waiters — probe succeeded, they can proceed
      this.resolveHalfOpenQueue(key, true);
    }

    circuit.state = 'CLOSED';
    circuit.failureCount = 0;
    circuit.successCount++;
    this.probeInFlight.delete(key);
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
      // Probe failed — reopen and reject queued waiters
      circuit.state = 'OPEN';
      circuit.openedAt = now;
      this.totalTrips++;
      this.probeInFlight.delete(key);
      this.resolveHalfOpenQueue(key, false);
      this.emitStateChange(key, 'HALF_OPEN', 'OPEN', circuit.failureCount);
      this.log(`🔴 Circuit re-OPENED for ${key} — probe failed`);
      return;
    }

    if (circuit.failureCount >= this.config.failureThreshold && circuit.state === 'CLOSED') {
      circuit.state = 'OPEN';
      circuit.openedAt = now;
      this.totalTrips++;
      this.emitStateChange(key, 'CLOSED', 'OPEN', circuit.failureCount);
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
      this.probeInFlight.delete(key);
      this.resolveHalfOpenQueue(key, false);
    } else {
      // Reject all queued waiters before clearing
      for (const key of Array.from(this.halfOpenQueue.keys())) {
        this.resolveHalfOpenQueue(key, false);
      }
      this.circuits.clear();
      this.probeInFlight.clear();
      this.halfOpenQueue.clear();
      this.totalTrips = 0;
      this.totalFastFails = 0;
    }
  }

  /**
   * Extract the endpoint group key from a full endpoint path.
   *
   * The grouping strategy determines the blast radius of a tripped circuit:
   * - 'path-prefix' (default): Groups by the full path up to the first
   *   dynamic segment (UUID or numeric ID). This means `/api/top/groups`
   *   and `/api/top/items` are tracked as SEPARATE circuits, so a failure
   *   in one does not block the other.
   * - 'first-two-segments': Legacy behavior. Groups by the first two path
   *   segments only. `/api/top/groups` and `/api/top/items` share one circuit
   *   keyed as `/api/top`, so a failure in either blocks both.
   * - Custom function: Caller-provided grouping logic.
   */
  private getEndpointKey(endpoint: string): string {
    // Strip query params
    const path = endpoint.split('?')[0];
    const strategy = this.config.groupingStrategy;

    // Custom function strategy
    if (typeof strategy === 'function') {
      return strategy(path);
    }

    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return '/';

    if (strategy === 'first-two-segments') {
      // Legacy: keep first two segments only
      if (segments.length === 1) return `/${segments[0]}`;
      return `/${segments[0]}/${segments[1]}`;
    }

    // Default 'path-prefix': keep all segments up to the first dynamic one.
    // Dynamic segments are UUIDs (contains hyphens + hex chars) or pure numeric IDs.
    const staticSegments: string[] = [];
    for (const seg of segments) {
      if (this.isDynamicSegment(seg)) break;
      staticSegments.push(seg);
    }

    return staticSegments.length > 0
      ? `/${staticSegments.join('/')}`
      : `/${segments[0]}`;
  }

  /**
   * Heuristic: a path segment is "dynamic" if it looks like a UUID or a numeric ID.
   * This lets us group `/lists/abc-def-123` as `/lists` while keeping
   * `/top/groups` and `/top/items` as distinct keys.
   */
  private isDynamicSegment(segment: string): boolean {
    // Pure numeric ID (e.g. "123", "45678")
    if (/^\d+$/.test(segment)) return true;
    // UUID pattern (8-4-4-4-12 hex)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
    // Short hex hash (e.g. Supabase IDs, 20+ hex chars)
    if (/^[0-9a-f]{20,}$/i.test(segment)) return true;
    return false;
  }

  /**
   * Resolve all queued HALF_OPEN waiters for an endpoint.
   */
  private resolveHalfOpenQueue(key: string, allowed: boolean): void {
    const queue = this.halfOpenQueue.get(key);
    if (queue) {
      for (const waiter of queue) {
        waiter.resolve(allowed);
      }
      this.halfOpenQueue.delete(key);
    }
  }

  /**
   * Emit a state change event via the configured callback (production-safe).
   */
  private emitStateChange(
    endpoint: string,
    previousState: CircuitState,
    newState: CircuitState,
    failureCount: number
  ): void {
    if (this.config.onStateChange) {
      this.config.onStateChange({
        endpoint,
        previousState,
        newState,
        failureCount,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Set or replace the onStateChange callback at runtime.
   */
  setOnStateChange(callback: CircuitStateChangeCallback | undefined): void {
    this.config.onStateChange = callback;
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
