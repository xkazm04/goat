/**
 * Health Check API Endpoint
 *
 * Used by the offline system to probe network connectivity.
 * Returns a minimal response for fast network checks.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: Date.now() },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
