import { logger } from './logger';
/**
 * ImageCache - In-memory cache for loaded images
 * 
 * Caches loaded sticker images to avoid repeated network requests
 * per Requirement 9.3
 */

class ImageCacheManager {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private failedUrls: Set<string> = new Set();
  private readonly MAX_CACHE_SIZE = 200; // Maximum number of cached images
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // ms

  /**
   * Preloads an image and caches it with retry logic
   * Returns a promise that resolves when the image is loaded
   */
  async preload(url: string, retryCount = 0): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Don't retry if already failed multiple times
    if (this.failedUrls.has(url) && retryCount === 0) {
      throw new Error(`Image previously failed to load: ${url}`);
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Create new loading promise with retry logic
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.addToCache(url, img);
        this.loadingPromises.delete(url);
        this.failedUrls.delete(url); // Clear failed status on success
        resolve(img);
      };

      img.onerror = async () => {
        this.loadingPromises.delete(url);
        
        // Retry logic
        if (retryCount < this.MAX_RETRIES) {
          logger.warn(`Retrying image load (${retryCount + 1}/${this.MAX_RETRIES}): ${url}`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * (retryCount + 1)));
          
          try {
            const retryResult = await this.preload(url, retryCount + 1);
            resolve(retryResult);
          } catch (err) {
            reject(err);
          }
        } else {
          this.failedUrls.add(url);
          reject(new Error(`Failed to load image after ${this.MAX_RETRIES} retries: ${url}`));
        }
      };

      img.src = url;
    });

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Adds an image to the cache
   * Implements LRU eviction when cache is full
   */
  private addToCache(url: string, img: HTMLImageElement): void {
    // If cache is full, remove oldest entry (first entry in Map)
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(url, img);
  }

  /**
   * Checks if an image is cached
   */
  has(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * Gets a cached image
   */
  get(url: string): HTMLImageElement | undefined {
    return this.cache.get(url);
  }

  /**
   * Clears the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
    this.failedUrls.clear();
  }

  /**
   * Clears failed URLs to allow retry
   */
  clearFailedUrls(): void {
    this.failedUrls.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats(): { size: number; maxSize: number; loading: number; failed: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      loading: this.loadingPromises.size,
      failed: this.failedUrls.size,
    };
  }
}

// Export singleton instance
export const ImageCache = new ImageCacheManager();
