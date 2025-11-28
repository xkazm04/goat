import { NextRequest, NextResponse } from "next/server";

/**
 * Grid Preview API
 *
 * Calculates the final snap position for drag-and-drop operations
 * before committing the change. This enables:
 * - Server-side validation of positions
 * - Conflict detection before commit
 * - Preview calculations for complex grid layouts
 */

interface GridPreviewRequest {
  itemId: string;
  currentPosition: { x: number; y: number };
  velocity: { x: number; y: number };
  gridConfig: {
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
    gap: number;
  };
  occupiedPositions: number[];
  inertiaFactor?: number;
}

interface GridPreviewResponse {
  success: boolean;
  snapPosition: {
    row: number;
    col: number;
    index: number;
  } | null;
  screenPosition: {
    x: number;
    y: number;
  } | null;
  isOccupied: boolean;
  alternatePositions: Array<{
    row: number;
    col: number;
    index: number;
    distance: number;
  }>;
  confidence: number;
}

/**
 * Calculate the nearest grid position with inertia
 */
function calculateSnapPosition(
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  config: GridPreviewRequest["gridConfig"],
  inertiaFactor: number
): { row: number; col: number; index: number; screenX: number; screenY: number } {
  // Project position based on velocity
  const projectedX = x + velocityX * inertiaFactor;
  const projectedY = y + velocityY * inertiaFactor;

  // Calculate grid position
  const col = Math.round(projectedX / (config.cellWidth + config.gap));
  const row = Math.round(projectedY / (config.cellHeight + config.gap));

  // Clamp to valid range
  const clampedCol = Math.max(0, Math.min(config.cols - 1, col));
  const clampedRow = Math.max(0, Math.min(config.rows - 1, row));

  // Calculate screen position of snap point
  const screenX = clampedCol * (config.cellWidth + config.gap) + config.cellWidth / 2;
  const screenY = clampedRow * (config.cellHeight + config.gap) + config.cellHeight / 2;

  return {
    row: clampedRow,
    col: clampedCol,
    index: clampedRow * config.cols + clampedCol,
    screenX,
    screenY,
  };
}

/**
 * Find alternate positions if the primary is occupied
 */
function findAlternatePositions(
  primaryPosition: { row: number; col: number },
  config: GridPreviewRequest["gridConfig"],
  occupiedPositions: number[],
  limit: number = 4
): Array<{ row: number; col: number; index: number; distance: number }> {
  const alternates: Array<{ row: number; col: number; index: number; distance: number }> = [];

  // Check adjacent positions in expanding rings
  const directions = [
    { dr: -1, dc: 0 }, // up
    { dr: 1, dc: 0 },  // down
    { dr: 0, dc: -1 }, // left
    { dr: 0, dc: 1 },  // right
    { dr: -1, dc: -1 }, // up-left
    { dr: -1, dc: 1 },  // up-right
    { dr: 1, dc: -1 },  // down-left
    { dr: 1, dc: 1 },   // down-right
  ];

  for (let radius = 1; radius <= Math.max(config.rows, config.cols); radius++) {
    for (const dir of directions) {
      const row = primaryPosition.row + dir.dr * radius;
      const col = primaryPosition.col + dir.dc * radius;

      // Check bounds
      if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) {
        continue;
      }

      const index = row * config.cols + col;

      // Skip if occupied
      if (occupiedPositions.includes(index)) {
        continue;
      }

      // Calculate distance
      const distance = Math.sqrt(
        Math.pow(row - primaryPosition.row, 2) +
        Math.pow(col - primaryPosition.col, 2)
      );

      alternates.push({ row, col, index, distance });

      if (alternates.length >= limit) {
        return alternates.sort((a, b) => a.distance - b.distance);
      }
    }
  }

  return alternates.sort((a, b) => a.distance - b.distance);
}

export async function POST(request: NextRequest) {
  try {
    const body: GridPreviewRequest = await request.json();

    const {
      itemId,
      currentPosition,
      velocity,
      gridConfig,
      occupiedPositions,
      inertiaFactor = 0.15,
    } = body;

    // Validate input
    if (!currentPosition || !gridConfig) {
      return NextResponse.json(
        { error: "Missing required fields: currentPosition and gridConfig" },
        { status: 400 }
      );
    }

    // Calculate snap position
    const snapResult = calculateSnapPosition(
      currentPosition.x,
      currentPosition.y,
      velocity?.x || 0,
      velocity?.y || 0,
      gridConfig,
      inertiaFactor
    );

    // Check if position is occupied
    const isOccupied = occupiedPositions?.includes(snapResult.index) || false;

    // Find alternate positions if needed
    const alternatePositions = isOccupied
      ? findAlternatePositions(
        { row: snapResult.row, col: snapResult.col },
        gridConfig,
        occupiedPositions
      )
      : [];

    // Calculate confidence based on velocity and distance
    const speed = Math.sqrt(
      Math.pow(velocity?.x || 0, 2) + Math.pow(velocity?.y || 0, 2)
    );
    const confidence = Math.max(0.5, 1 - speed / 2000);

    const response: GridPreviewResponse = {
      success: true,
      snapPosition: {
        row: snapResult.row,
        col: snapResult.col,
        index: snapResult.index,
      },
      screenPosition: {
        x: snapResult.screenX,
        y: snapResult.screenY,
      },
      isOccupied,
      alternatePositions,
      confidence,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Grid preview calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate grid preview" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for quick position lookups
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const x = parseFloat(searchParams.get("x") || "0");
  const y = parseFloat(searchParams.get("y") || "0");
  const cols = parseInt(searchParams.get("cols") || "10");
  const rows = parseInt(searchParams.get("rows") || "10");
  const cellWidth = parseFloat(searchParams.get("cellWidth") || "80");
  const cellHeight = parseFloat(searchParams.get("cellHeight") || "80");
  const gap = parseFloat(searchParams.get("gap") || "8");

  const col = Math.round(x / (cellWidth + gap));
  const row = Math.round(y / (cellHeight + gap));

  const clampedCol = Math.max(0, Math.min(cols - 1, col));
  const clampedRow = Math.max(0, Math.min(rows - 1, row));

  return NextResponse.json({
    position: {
      row: clampedRow,
      col: clampedCol,
      index: clampedRow * cols + clampedCol,
    },
    screenPosition: {
      x: clampedCol * (cellWidth + gap) + cellWidth / 2,
      y: clampedRow * (cellHeight + gap) + cellHeight / 2,
    },
  });
}
