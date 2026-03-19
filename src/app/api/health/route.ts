/**
 * Health Check API Endpoint
 *
 * Used by the offline system to probe network connectivity.
 * Returns dependency health status for Supabase and CircuitBreaker.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGlobalCircuitBreaker } from '@/lib/api/CircuitBreaker';

type DependencyStatus = 'healthy' | 'degraded' | 'unhealthy';

interface DependencyHealth {
  status: DependencyStatus;
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: DependencyStatus;
  dependencies: {
    supabase: DependencyHealth;
    circuitBreaker: DependencyHealth & {
      openCircuits?: string[];
      totalTrips?: number;
    };
  };
  timestamp: number;
}

async function checkSupabase(): Promise<DependencyHealth> {
  const start = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('items').select('id').limit(1);
    const latencyMs = Date.now() - start;

    if (error) {
      return { status: 'unhealthy', latencyMs, error: error.message };
    }

    // Over 2 seconds is considered degraded
    return {
      status: latencyMs > 2000 ? 'degraded' : 'healthy',
      latencyMs,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function checkCircuitBreaker(): DependencyHealth & {
  openCircuits?: string[];
  totalTrips?: number;
} {
  try {
    const cb = getGlobalCircuitBreaker();
    const stats = cb.getStats();

    const openCircuits = Object.entries(stats.circuits)
      .filter(([, c]) => c.state === 'OPEN' || c.state === 'HALF_OPEN')
      .map(([key]) => key);

    const status: DependencyStatus =
      openCircuits.length > 0 ? 'degraded' : 'healthy';

    return {
      status,
      openCircuits: openCircuits.length > 0 ? openCircuits : undefined,
      totalTrips: stats.totalTrips,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

function overallStatus(deps: HealthResponse['dependencies']): DependencyStatus {
  const statuses = [deps.supabase.status, deps.circuitBreaker.status];
  if (statuses.includes('unhealthy')) return 'unhealthy';
  if (statuses.includes('degraded')) return 'degraded';
  return 'healthy';
}

export async function GET() {
  const [supabase, circuitBreaker] = await Promise.all([
    checkSupabase(),
    Promise.resolve(checkCircuitBreaker()),
  ]);

  const dependencies = { supabase, circuitBreaker };
  const status = overallStatus(dependencies);

  const response: HealthResponse = {
    status,
    dependencies,
    timestamp: Date.now(),
  };

  const httpStatus = status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
