/**
 * Browser pool for Puppeteer instances
 *
 * Manages a pool of browser instances to avoid the overhead of
 * launching a new browser for each operation
 */

import puppeteer, { Browser } from 'puppeteer';

export interface BrowserPoolOptions {
  /** Maximum number of browser instances in pool */
  maxInstances?: number;
  /** Browser launch timeout in milliseconds */
  launchTimeout?: number;
  /** Idle timeout before closing browser (milliseconds) */
  idleTimeout?: number;
  /** Enable headless mode */
  headless?: boolean;
}

interface PooledBrowser {
  browser: Browser;
  inUse: boolean;
  lastUsed: number;
  id: string;
}

export class BrowserPool {
  private pool: PooledBrowser[] = [];
  private options: Required<BrowserPoolOptions>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private instanceCounter = 0;

  constructor(options: BrowserPoolOptions = {}) {
    this.options = {
      maxInstances: options.maxInstances || 3,
      launchTimeout: options.launchTimeout || 60000,
      idleTimeout: options.idleTimeout || 5 * 60 * 1000, // 5 minutes
      headless: options.headless !== false,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Acquire a browser instance from the pool
   */
  async acquire(): Promise<Browser> {
    // Try to find an available browser
    const available = this.pool.find((pb) => !pb.inUse);

    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      console.debug(`BrowserPool: Reusing browser ${available.id}`);
      return available.browser;
    }

    // If pool is not full, create a new instance
    if (this.pool.length < this.options.maxInstances) {
      const browser = await this.createBrowser();
      const id = `browser-${++this.instanceCounter}`;

      const pooledBrowser: PooledBrowser = {
        browser,
        inUse: true,
        lastUsed: Date.now(),
        id,
      };

      this.pool.push(pooledBrowser);
      console.debug(
        `BrowserPool: Created new browser ${id} (${this.pool.length}/${this.options.maxInstances})`,
      );
      return browser;
    }

    // Pool is full, wait for an available instance
    console.warn('BrowserPool: Pool is full, waiting for available browser...');
    return this.waitForAvailableBrowser();
  }

  /**
   * Release a browser instance back to the pool
   */
  async release(browser: Browser): Promise<void> {
    const pooled = this.pool.find((pb) => pb.browser === browser);

    if (pooled) {
      pooled.inUse = false;
      pooled.lastUsed = Date.now();
      console.debug(`BrowserPool: Released browser ${pooled.id}`);
    } else {
      console.warn('BrowserPool: Attempted to release unknown browser');
      // Close the unknown browser
      try {
        await browser.close();
      } catch (error) {
        // Ignore errors
      }
    }
  }

  /**
   * Close all browsers and clear the pool
   */
  async closeAll(): Promise<void> {
    console.debug(`BrowserPool: Closing all ${this.pool.length} browsers`);

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const closePromises = this.pool.map(async (pb) => {
      try {
        await pb.browser.close();
      } catch (error) {
        console.error(`Failed to close browser ${pb.id}:`, error);
      }
    });

    await Promise.all(closePromises);
    this.pool = [];
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    inUse: number;
    available: number;
    maxInstances: number;
  } {
    const inUse = this.pool.filter((pb) => pb.inUse).length;
    return {
      total: this.pool.length,
      inUse,
      available: this.pool.length - inUse,
      maxInstances: this.options.maxInstances,
    };
  }

  /**
   * Create a new browser instance
   */
  private async createBrowser(): Promise<Browser> {
    const browser = await puppeteer.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-notifications',
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-crash-upload',
        '--disable-crash-reporter',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--no-pings',
      ],
      timeout: this.options.launchTimeout,
      protocolTimeout: this.options.launchTimeout,
    });

    return browser;
  }

  /**
   * Wait for an available browser (with timeout)
   */
  private async waitForAvailableBrowser(): Promise<Browser> {
    const timeout = 30000; // 30 seconds
    const pollInterval = 100; // Check every 100ms
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const available = this.pool.find((pb) => !pb.inUse);
      if (available) {
        available.inUse = true;
        available.lastUsed = Date.now();
        return available.browser;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('BrowserPool: Timeout waiting for available browser');
  }

  /**
   * Start cleanup interval to close idle browsers
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleBrowsers();
    }, 60 * 1000);

    // Unref the timer so it doesn't prevent Node.js from exiting
    this.cleanupInterval.unref();
  }

  /**
   * Close browsers that have been idle for too long
   */
  private async cleanupIdleBrowsers(): Promise<void> {
    const now = Date.now();
    const toClose: PooledBrowser[] = [];

    for (const pb of this.pool) {
      if (!pb.inUse && now - pb.lastUsed > this.options.idleTimeout) {
        toClose.push(pb);
      }
    }

    if (toClose.length > 0) {
      console.debug(`BrowserPool: Cleaning up ${toClose.length} idle browsers`);

      for (const pb of toClose) {
        try {
          await pb.browser.close();
          const index = this.pool.indexOf(pb);
          if (index > -1) {
            this.pool.splice(index, 1);
          }
        } catch (error) {
          console.error(`Failed to close idle browser ${pb.id}:`, error);
        }
      }
    }
  }
}

// Global browser pool instance
let globalBrowserPool: BrowserPool | null = null;

/**
 * Get the global browser pool instance
 */
export function getGlobalBrowserPool(
  options?: BrowserPoolOptions,
): BrowserPool {
  if (!globalBrowserPool) {
    globalBrowserPool = new BrowserPool(options);
  }
  return globalBrowserPool;
}

/**
 * Close the global browser pool
 */
export async function closeGlobalBrowserPool(): Promise<void> {
  if (globalBrowserPool) {
    await globalBrowserPool.closeAll();
    globalBrowserPool = null;
  }
}
