interface StorageAdapter {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

// A simple no-op storage adapter for server-side rendering
const createServerStorage = (): StorageAdapter => ({
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
});

// Create a storage adapter that's safe to use in both client and server environments
export const createSafeStorage = (
  clientStorage: () => StorageAdapter
): StorageAdapter => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  // Return the appropriate storage based on environment
  if (!isBrowser) {
    return createServerStorage();
  }

  // We're in a browser, return the client storage
  return clientStorage();
};