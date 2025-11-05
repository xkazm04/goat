import { GridItemType } from '@/types/match';
import { calculateImageHash } from './resultImagePrompt';

const DB_NAME = 'goat-result-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

export interface CachedResultImage {
  hash: string;
  imageData: string; // Base64 or Blob URL
  imageUrl?: string; // External URL if hosted
  metadata: {
    title: string;
    category: string;
    subcategory?: string;
    itemCount: number;
    style: string;
    generatedAt: number;
  };
  items: Array<{
    position: number;
    title: string;
  }>;
}

class ResultCacheManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async initDB(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ ResultCache: IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
          objectStore.createIndex('generatedAt', 'metadata.generatedAt', { unique: false });
          console.log('✅ ResultCache: Object store created');
        }
      };
    });

    return this.initPromise;
  }

  async saveImage(
    items: GridItemType[],
    metadata: any,
    imageData: string,
    style: string,
    imageUrl?: string
  ): Promise<string> {
    try {
      await this.initDB();
      if (!this.db) throw new Error('Database not initialized');

      const hash = calculateImageHash(items, metadata);
      const matchedItems = items.filter(item => item.matched);

      const cachedImage: CachedResultImage = {
        hash,
        imageData,
        imageUrl,
        metadata: {
          title: metadata.title,
          category: metadata.category,
          subcategory: metadata.subcategory,
          itemCount: matchedItems.length,
          style,
          generatedAt: Date.now(),
        },
        items: matchedItems.map(item => ({
          position: item.position + 1,
          title: item.title,
        })),
      };

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await new Promise<void>((resolve, reject) => {
        const request = store.put(cachedImage);
        request.onsuccess = () => {
          console.log(`✅ ResultCache: Image saved with hash ${hash}`);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });

      return hash;
    } catch (error) {
      console.error('Failed to save image to cache:', error);
      throw error;
    }
  }

  async getImage(items: GridItemType[], metadata: any): Promise<CachedResultImage | null> {
    try {
      await this.initDB();
      if (!this.db) throw new Error('Database not initialized');

      const hash = calculateImageHash(items, metadata);
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise<CachedResultImage | null>((resolve, reject) => {
        const request = store.get(hash);
        request.onsuccess = () => {
          const result = request.result as CachedResultImage | undefined;
          if (result) {
            console.log(`✅ ResultCache: Cache hit for hash ${hash}`);
          } else {
            console.log(`⚠️ ResultCache: Cache miss for hash ${hash}`);
          }
          resolve(result || null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get image from cache:', error);
      return null;
    }
  }

  async getAllImages(): Promise<CachedResultImage[]> {
    try {
      await this.initDB();
      if (!this.db) throw new Error('Database not initialized');

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise<CachedResultImage[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get all images from cache:', error);
      return [];
    }
  }

  async deleteImage(hash: string): Promise<void> {
    try {
      await this.initDB();
      if (!this.db) throw new Error('Database not initialized');

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(hash);
        request.onsuccess = () => {
          console.log(`✅ ResultCache: Image deleted with hash ${hash}`);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to delete image from cache:', error);
      throw error;
    }
  }

  async clearOldImages(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      await this.initDB();
      if (!this.db) throw new Error('Database not initialized');

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('generatedAt');

      const cutoffTime = Date.now() - maxAgeMs;
      const range = IDBKeyRange.upperBound(cutoffTime);

      return new Promise<void>((resolve, reject) => {
        const request = index.openCursor(range);
        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            console.log(`✅ ResultCache: Cleared ${deletedCount} old images`);
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear old images:', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.initDB();
      if (!this.db) throw new Error('Database not initialized');

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => {
          console.log('✅ ResultCache: All images cleared');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const images = await this.getAllImages();
      let totalSize = 0;

      for (const image of images) {
        // Estimate size of base64 string
        const dataSize = image.imageData.length * 0.75; // Base64 is ~33% larger than binary
        totalSize += dataSize;
      }

      return totalSize;
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      return 0;
    }
  }
}

// Singleton instance
export const resultCache = new ResultCacheManager();

// Helper functions for easy usage
export async function getCachedResultImage(
  items: GridItemType[],
  metadata: any
): Promise<CachedResultImage | null> {
  return resultCache.getImage(items, metadata);
}

export async function saveCachedResultImage(
  items: GridItemType[],
  metadata: any,
  imageData: string,
  style: string,
  imageUrl?: string
): Promise<string> {
  return resultCache.saveImage(items, metadata, imageData, style, imageUrl);
}

export async function clearCachedImages(olderThanDays: number = 30): Promise<void> {
  const maxAgeMs = olderThanDays * 24 * 60 * 60 * 1000;
  return resultCache.clearOldImages(maxAgeMs);
}
