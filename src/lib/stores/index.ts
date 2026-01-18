// Lazy store accessor (legacy - prefer StoreRegistry for new code)
export { createLazyStoreAccessor } from './lazy-store-accessor';

// Store Registry - Explicit dependency management
export {
  StoreRegistry,
  createStoreRegistry,
  defineStore,
  type ZustandStore,
  type StoreFactory,
  type StoreConfig,
  type RegistryConfig,
  type StoreState,
} from './store-registry';
