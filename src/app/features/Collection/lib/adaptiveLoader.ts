/**
 * Adaptive Loader
 * Device-aware batch sizing and loading strategies
 * Adapts to device capabilities, network conditions, and memory pressure
 */

/**
 * Device capability tier
 */
export type DeviceTier = 'low' | 'medium' | 'high';

/**
 * Network quality tier
 */
export type NetworkTier = 'slow' | 'medium' | 'fast' | 'offline';

/**
 * Device capabilities assessment
 */
export interface DeviceCapabilities {
  tier: DeviceTier;
  cpuCores: number;
  memoryGB: number | null;
  hasGPU: boolean;
  isLowEndDevice: boolean;
  isMobile: boolean;
  supportsOffscreenCanvas: boolean;
  maxTextureSize: number | null;
}

/**
 * Network conditions assessment
 */
export interface NetworkConditions {
  tier: NetworkTier;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
  saveData: boolean;
}

/**
 * Memory pressure state
 */
export interface MemoryPressure {
  isUnderPressure: boolean;
  usedHeapRatio: number | null;
  jsHeapSizeLimit: number | null;
  usedJSHeapSize: number | null;
}

/**
 * Adaptive loading configuration
 */
export interface AdaptiveLoaderConfig {
  /** Batch sizes for each device tier */
  batchSizes: Record<DeviceTier, number>;
  /** Preload counts for each tier */
  preloadCounts: Record<DeviceTier, number>;
  /** Image quality for each tier */
  imageQuality: Record<DeviceTier, 'low' | 'medium' | 'high'>;
  /** Enable progressive loading */
  progressiveLoading: boolean;
  /** Memory pressure threshold (0-1) */
  memoryPressureThreshold: number;
  /** Enable performance monitoring */
  monitorPerformance: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveLoaderConfig = {
  batchSizes: {
    low: 20,
    medium: 50,
    high: 100,
  },
  preloadCounts: {
    low: 10,
    medium: 20,
    high: 40,
  },
  imageQuality: {
    low: 'low',
    medium: 'medium',
    high: 'high',
  },
  progressiveLoading: true,
  memoryPressureThreshold: 0.8,
  monitorPerformance: true,
};

/**
 * Loading strategy result
 */
export interface LoadingStrategy {
  batchSize: number;
  preloadCount: number;
  imageQuality: 'low' | 'medium' | 'high';
  shouldReduceAnimations: boolean;
  shouldUseSimpleSkeleton: boolean;
  shouldUsePlaceholderImages: boolean;
  maxConcurrentLoads: number;
  debounceMs: number;
}

/**
 * Performance metrics
 */
export interface AdaptiveMetrics {
  frameRate: number;
  avgFrameTime: number;
  longTaskCount: number;
  memoryUsage: number | null;
  networkLatency: number | null;
}

/**
 * AdaptiveLoader class
 */
export class AdaptiveLoader {
  private config: AdaptiveLoaderConfig;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private networkConditions: NetworkConditions | null = null;
  private memoryPressure: MemoryPressure | null = null;
  private frameTimes: number[] = [];
  private longTasks: number = 0;
  private performanceObserver: PerformanceObserver | null = null;

  constructor(config: Partial<AdaptiveLoaderConfig> = {}) {
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    this.detectCapabilities();
    this.setupMonitoring();
  }

  /**
   * Detect device capabilities
   */
  detectCapabilities(): DeviceCapabilities {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const win = typeof window !== 'undefined' ? window : null;

    // CPU cores
    const cpuCores = nav?.hardwareConcurrency || 4;

    // Memory (Chrome only)
    // @ts-ignore - deviceMemory is not in all browser types
    const memoryGB = nav?.deviceMemory || null;

    // Check for GPU
    let hasGPU = false;
    let maxTextureSize: number | null = null;
    if (win) {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        hasGPU = true;
        // @ts-ignore - WebGL context types
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      }
    }

    // Mobile detection
    const isMobile = nav?.userAgent
      ? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(nav.userAgent)
      : false;

    // OffscreenCanvas support
    const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

    // Determine tier
    let tier: DeviceTier = 'medium';
    if (cpuCores <= 2 || (memoryGB && memoryGB <= 2) || (isMobile && cpuCores <= 4)) {
      tier = 'low';
    } else if (cpuCores >= 8 && (!memoryGB || memoryGB >= 8) && hasGPU) {
      tier = 'high';
    }

    const isLowEndDevice = tier === 'low';

    this.deviceCapabilities = {
      tier,
      cpuCores,
      memoryGB,
      hasGPU,
      isLowEndDevice,
      isMobile,
      supportsOffscreenCanvas,
      maxTextureSize,
    };

    return this.deviceCapabilities;
  }

  /**
   * Detect network conditions
   */
  detectNetworkConditions(): NetworkConditions {
    const nav = typeof navigator !== 'undefined' ? navigator : null;

    // @ts-ignore - Network Information API
    const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection;

    let tier: NetworkTier = 'medium';
    let effectiveType: string | null = null;
    let downlink: number | null = null;
    let rtt: number | null = null;
    let saveData = false;

    if (connection) {
      effectiveType = connection.effectiveType || null;
      downlink = connection.downlink || null;
      rtt = connection.rtt || null;
      saveData = connection.saveData || false;

      // Determine tier based on effectiveType
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        tier = 'slow';
      } else if (effectiveType === '3g') {
        tier = 'medium';
      } else if (effectiveType === '4g') {
        tier = downlink && downlink > 5 ? 'fast' : 'medium';
      }

      // Override if save data is enabled
      if (saveData) {
        tier = 'slow';
      }
    }

    // Check if offline
    if (!nav?.onLine) {
      tier = 'offline';
    }

    this.networkConditions = {
      tier,
      effectiveType,
      downlink,
      rtt,
      saveData,
    };

    return this.networkConditions;
  }

  /**
   * Check memory pressure
   */
  checkMemoryPressure(): MemoryPressure {
    // @ts-ignore - Memory API is Chrome only
    const memory = typeof performance !== 'undefined' ? (performance as any).memory : null;

    let isUnderPressure = false;
    let usedHeapRatio: number | null = null;
    let jsHeapSizeLimit: number | null = null;
    let usedJSHeapSize: number | null = null;

    if (memory) {
      jsHeapSizeLimit = memory.jsHeapSizeLimit;
      usedJSHeapSize = memory.usedJSHeapSize;

      if (jsHeapSizeLimit && usedJSHeapSize) {
        usedHeapRatio = usedJSHeapSize / jsHeapSizeLimit;
        isUnderPressure = usedHeapRatio > this.config.memoryPressureThreshold;
      }
    }

    this.memoryPressure = {
      isUnderPressure,
      usedHeapRatio,
      jsHeapSizeLimit,
      usedJSHeapSize,
    };

    return this.memoryPressure;
  }

  /**
   * Setup performance monitoring
   */
  private setupMonitoring(): void {
    if (!this.config.monitorPerformance) return;
    if (typeof window === 'undefined') return;

    // Monitor long tasks
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.duration > 50) {
              this.longTasks++;
            }
          });
        });
        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // longtask not supported in all browsers
      }
    }

    // Monitor frame rate
    let lastTime = performance.now();
    const measureFrame = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      this.frameTimes.push(delta);
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }

      requestAnimationFrame(measureFrame);
    };
    requestAnimationFrame(measureFrame);
  }

  /**
   * Get optimal loading strategy
   */
  getLoadingStrategy(): LoadingStrategy {
    // Ensure we have current assessments
    if (!this.deviceCapabilities) this.detectCapabilities();
    if (!this.networkConditions) this.detectNetworkConditions();
    this.checkMemoryPressure();

    const deviceTier = this.deviceCapabilities!.tier;
    const networkTier = this.networkConditions!.tier;
    const isUnderPressure = this.memoryPressure?.isUnderPressure || false;

    // Calculate effective tier (minimum of device and network)
    let effectiveTier: DeviceTier = deviceTier;
    if (networkTier === 'slow' || networkTier === 'offline') {
      effectiveTier = 'low';
    } else if (networkTier === 'medium' && effectiveTier === 'high') {
      effectiveTier = 'medium';
    }

    // Downgrade if under memory pressure
    if (isUnderPressure && effectiveTier !== 'low') {
      effectiveTier = effectiveTier === 'high' ? 'medium' : 'low';
    }

    // Downgrade if frame rate is low
    const avgFrameTime = this.getAverageFrameTime();
    if (avgFrameTime > 20 && effectiveTier !== 'low') {
      effectiveTier = effectiveTier === 'high' ? 'medium' : 'low';
    }

    const batchSize = this.config.batchSizes[effectiveTier];
    const preloadCount = this.config.preloadCounts[effectiveTier];
    const imageQuality = this.config.imageQuality[effectiveTier];

    return {
      batchSize,
      preloadCount,
      imageQuality,
      shouldReduceAnimations: effectiveTier === 'low' || isUnderPressure,
      shouldUseSimpleSkeleton: effectiveTier === 'low',
      shouldUsePlaceholderImages: networkTier === 'slow' || networkTier === 'offline',
      maxConcurrentLoads: effectiveTier === 'low' ? 2 : effectiveTier === 'medium' ? 4 : 8,
      debounceMs: effectiveTier === 'low' ? 100 : effectiveTier === 'medium' ? 50 : 16,
    };
  }

  /**
   * Get average frame time
   */
  private getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67; // Default 60fps
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  /**
   * Get current metrics
   */
  getMetrics(): AdaptiveMetrics {
    const avgFrameTime = this.getAverageFrameTime();
    const frameRate = 1000 / avgFrameTime;

    return {
      frameRate: Math.round(frameRate),
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      longTaskCount: this.longTasks,
      memoryUsage: this.memoryPressure?.usedHeapRatio || null,
      networkLatency: this.networkConditions?.rtt || null,
    };
  }

  /**
   * Get device capabilities
   */
  getDeviceCapabilities(): DeviceCapabilities {
    if (!this.deviceCapabilities) {
      this.detectCapabilities();
    }
    return this.deviceCapabilities!;
  }

  /**
   * Get network conditions
   */
  getNetworkConditions(): NetworkConditions {
    if (!this.networkConditions) {
      this.detectNetworkConditions();
    }
    return this.networkConditions!;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AdaptiveLoaderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  /**
   * Get recommended image size based on current conditions
   */
  getRecommendedImageSize(originalWidth: number, originalHeight: number): { width: number; height: number } {
    const strategy = this.getLoadingStrategy();
    const qualityMultipliers = {
      low: 0.5,
      medium: 0.75,
      high: 1,
    };

    const multiplier = qualityMultipliers[strategy.imageQuality];
    const maxSize = this.deviceCapabilities?.maxTextureSize || 4096;

    let width = Math.round(originalWidth * multiplier);
    let height = Math.round(originalHeight * multiplier);

    // Ensure we don't exceed max texture size
    if (width > maxSize || height > maxSize) {
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    return { width, height };
  }

  /**
   * Check if progressive loading should be used
   */
  shouldUseProgressiveLoading(): boolean {
    return this.config.progressiveLoading &&
      this.networkConditions?.tier !== 'fast';
  }
}

/**
 * Create adaptive loader with config
 */
export function createAdaptiveLoader(
  config?: Partial<AdaptiveLoaderConfig>
): AdaptiveLoader {
  return new AdaptiveLoader(config);
}

/**
 * Singleton instance for app-wide use
 */
let globalAdaptiveLoader: AdaptiveLoader | null = null;

/**
 * Get global adaptive loader instance
 */
export function getGlobalAdaptiveLoader(): AdaptiveLoader {
  if (!globalAdaptiveLoader) {
    globalAdaptiveLoader = new AdaptiveLoader();
  }
  return globalAdaptiveLoader;
}

/**
 * Reset global adaptive loader
 */
export function resetGlobalAdaptiveLoader(): void {
  if (globalAdaptiveLoader) {
    globalAdaptiveLoader.destroy();
    globalAdaptiveLoader = null;
  }
}
