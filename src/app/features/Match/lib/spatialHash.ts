/**
 * Spatial Hash Grid
 * O(1) lookup for nearby magnetic fields during drag operations
 * Optimizes field calculations for grids with 50+ positions
 */

/**
 * 2D Point
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Bounding box for spatial queries
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Entity stored in spatial hash
 */
export interface SpatialEntity<T = any> {
  id: string;
  position: Point;
  radius: number;
  data: T;
}

/**
 * Cell in the spatial hash grid
 */
interface HashCell<T> {
  entities: Map<string, SpatialEntity<T>>;
}

/**
 * Configuration for spatial hash
 */
export interface SpatialHashConfig {
  /** Cell size - should be roughly the size of the largest search radius */
  cellSize: number;
  /** Initial grid bounds (can expand dynamically) */
  initialBounds?: BoundingBox;
}

/**
 * Query result with distance information
 */
export interface QueryResult<T> {
  entity: SpatialEntity<T>;
  distance: number;
  /** Normalized distance (0 = at center, 1 = at radius edge) */
  normalizedDistance: number;
}

/**
 * Spatial Hash Grid for efficient proximity queries
 */
export class SpatialHashGrid<T = any> {
  private cells: Map<string, HashCell<T>> = new Map();
  private entities: Map<string, SpatialEntity<T>> = new Map();
  private entityCells: Map<string, Set<string>> = new Map();
  private cellSize: number;

  constructor(config: SpatialHashConfig) {
    this.cellSize = config.cellSize;
  }

  /**
   * Get cell key for a position
   */
  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX}:${cellY}`;
  }

  /**
   * Get all cell keys that an entity overlaps
   */
  private getEntityCellKeys(entity: SpatialEntity<T>): string[] {
    const { position, radius } = entity;
    const keys: string[] = [];

    // Calculate cell range the entity covers
    const minCellX = Math.floor((position.x - radius) / this.cellSize);
    const maxCellX = Math.floor((position.x + radius) / this.cellSize);
    const minCellY = Math.floor((position.y - radius) / this.cellSize);
    const maxCellY = Math.floor((position.y + radius) / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        keys.push(`${x}:${y}`);
      }
    }

    return keys;
  }

  /**
   * Get or create a cell
   */
  private getOrCreateCell(key: string): HashCell<T> {
    let cell = this.cells.get(key);
    if (!cell) {
      cell = { entities: new Map() };
      this.cells.set(key, cell);
    }
    return cell;
  }

  /**
   * Insert an entity into the spatial hash
   */
  insert(entity: SpatialEntity<T>): void {
    // Remove existing if updating
    if (this.entities.has(entity.id)) {
      this.remove(entity.id);
    }

    // Store entity
    this.entities.set(entity.id, entity);

    // Add to all overlapping cells
    const cellKeys = this.getEntityCellKeys(entity);
    this.entityCells.set(entity.id, new Set(cellKeys));

    for (const key of cellKeys) {
      const cell = this.getOrCreateCell(key);
      cell.entities.set(entity.id, entity);
    }
  }

  /**
   * Remove an entity from the spatial hash
   */
  remove(id: string): boolean {
    const cellKeys = this.entityCells.get(id);
    if (!cellKeys) return false;

    // Remove from all cells
    Array.from(cellKeys).forEach((key) => {
      const cell = this.cells.get(key);
      if (cell) {
        cell.entities.delete(id);
        // Clean up empty cells
        if (cell.entities.size === 0) {
          this.cells.delete(key);
        }
      }
    });

    this.entityCells.delete(id);
    this.entities.delete(id);
    return true;
  }

  /**
   * Update an entity's position
   */
  update(id: string, newPosition: Point, newRadius?: number): void {
    const entity = this.entities.get(id);
    if (!entity) return;

    const updatedEntity: SpatialEntity<T> = {
      ...entity,
      position: newPosition,
      radius: newRadius ?? entity.radius,
    };

    this.insert(updatedEntity);
  }

  /**
   * Query entities near a point
   */
  queryPoint(point: Point, radius: number): QueryResult<T>[] {
    const results: QueryResult<T>[] = [];
    const checked = new Set<string>();

    // Calculate cell range to check
    const minCellX = Math.floor((point.x - radius) / this.cellSize);
    const maxCellX = Math.floor((point.x + radius) / this.cellSize);
    const minCellY = Math.floor((point.y - radius) / this.cellSize);
    const maxCellY = Math.floor((point.y + radius) / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const cell = this.cells.get(`${x}:${y}`);
        if (!cell) continue;

        Array.from(cell.entities.entries()).forEach(([id, entity]) => {
          if (checked.has(id)) return;
          checked.add(id);

          // Calculate distance
          const dx = entity.position.x - point.x;
          const dy = entity.position.y - point.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Check if within search radius AND within entity's radius
          const maxDistance = Math.max(radius, entity.radius);
          if (dist <= maxDistance) {
            results.push({
              entity,
              distance: dist,
              normalizedDistance: dist / entity.radius,
            });
          }
        });
      }
    }

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);
    return results;
  }

  /**
   * Query entities within a bounding box
   */
  queryBounds(bounds: BoundingBox): SpatialEntity<T>[] {
    const results: SpatialEntity<T>[] = [];
    const checked = new Set<string>();

    const minCellX = Math.floor(bounds.minX / this.cellSize);
    const maxCellX = Math.floor(bounds.maxX / this.cellSize);
    const minCellY = Math.floor(bounds.minY / this.cellSize);
    const maxCellY = Math.floor(bounds.maxY / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const cell = this.cells.get(`${x}:${y}`);
        if (!cell) continue;

        Array.from(cell.entities.entries()).forEach(([id, entity]) => {
          if (checked.has(id)) return;
          checked.add(id);

          // Check if entity center is within bounds
          const { position } = entity;
          if (
            position.x >= bounds.minX &&
            position.x <= bounds.maxX &&
            position.y >= bounds.minY &&
            position.y <= bounds.maxY
          ) {
            results.push(entity);
          }
        });
      }
    }

    return results;
  }

  /**
   * Find the nearest entity to a point
   */
  findNearest(point: Point, maxRadius?: number): QueryResult<T> | null {
    const searchRadius = maxRadius ?? this.cellSize * 2;
    const results = this.queryPoint(point, searchRadius);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find all entities within their own radius of a point
   * (i.e., where the point is inside the entity's field)
   */
  findContaining(point: Point): QueryResult<T>[] {
    // Query with a large radius, then filter
    const results = this.queryPoint(point, this.cellSize * 3);
    return results.filter((r) => r.distance <= r.entity.radius);
  }

  /**
   * Get an entity by ID
   */
  get(id: string): SpatialEntity<T> | undefined {
    return this.entities.get(id);
  }

  /**
   * Check if an entity exists
   */
  has(id: string): boolean {
    return this.entities.has(id);
  }

  /**
   * Get all entities
   */
  getAll(): SpatialEntity<T>[] {
    return Array.from(this.entities.values());
  }

  /**
   * Clear all entities
   */
  clear(): void {
    this.cells.clear();
    this.entities.clear();
    this.entityCells.clear();
  }

  /**
   * Get statistics about the hash grid
   */
  getStats(): {
    entityCount: number;
    cellCount: number;
    avgEntitiesPerCell: number;
  } {
    const entityCount = this.entities.size;
    const cellCount = this.cells.size;
    const avgEntitiesPerCell =
      cellCount > 0
        ? Array.from(this.cells.values()).reduce(
            (sum, cell) => sum + cell.entities.size,
            0
          ) / cellCount
        : 0;

    return { entityCount, cellCount, avgEntitiesPerCell };
  }
}

/**
 * Create a spatial hash grid with default settings for magnetic fields
 */
export function createMagneticFieldHash<T = any>(
  cellSize: number = 150
): SpatialHashGrid<T> {
  return new SpatialHashGrid<T>({ cellSize });
}

/**
 * Calculate distance between two points
 */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate squared distance (faster, for comparisons)
 */
export function distanceSquared(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/**
 * Normalize a distance to 0-1 range
 */
export function normalizeDistance(dist: number, maxDist: number): number {
  return Math.min(1, Math.max(0, dist / maxDist));
}

/**
 * Interpolate between two points
 */
export function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export default SpatialHashGrid;
