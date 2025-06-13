const DB_NAME = 'goat-app-storage';
const STORE_NAME = 'zustand-store';
const DB_VERSION = 1;

interface StorageAdapter {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && window.indexedDB;

export const createIndexedDBStorage = (storeName: string): StorageAdapter => {
  // If we're not in a browser, return a noop storage adapter
  if (!isBrowser) {
    console.log('IndexedDB not available - using fallback storage');
    return {
      getItem: async (name: string) => null,
      setItem: async (name: string, value: string) => {},
      removeItem: async (name: string) => {}
    };
  }

  // Open database connection
  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  };
  
  // Get item from IndexedDB
  const getItem = async (name: string): Promise<string | null> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(`${storeName}:${name}`);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
          resolve(request.result || null);
        };
      });
    } catch (error) {
      console.error('Error getting item from IndexedDB:', error);
      
      // Fallback to localStorage
      try {
        return localStorage.getItem(`${storeName}:${name}`);
      } catch {
        return null;
      }
    }
  };
  
  // Set item in IndexedDB
  const setItem = async (name: string, value: string): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, `${storeName}:${name}`);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error setting item in IndexedDB:', error);
      
      // Fallback to localStorage
      try {
        localStorage.setItem(`${storeName}:${name}`, value);
      } catch (error) {
        console.error('Error setting item in localStorage:', error);
      }
    }
  };
  
  // Remove item from IndexedDB
  const removeItem = async (name: string): Promise<void> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(`${storeName}:${name}`);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error removing item from IndexedDB:', error);
      
      // Fallback to localStorage
      try {
        localStorage.removeItem(`${storeName}:${name}`);
      } catch {
        // Ignore
      }
    }
  };
  
  // Return storage adapter
  return {
    getItem,
    setItem,
    removeItem
  };
};