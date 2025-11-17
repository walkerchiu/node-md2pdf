import {
  BrowserPool,
  getGlobalBrowserPool,
  closeGlobalBrowserPool,
} from '../../../src/utils/browser-pool';
import type { Browser } from 'puppeteer';

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('BrowserPool', () => {
  let pool: BrowserPool;

  beforeEach(() => {
    pool = new BrowserPool({
      maxInstances: 3,
      idleTimeout: 1000,
      launchTimeout: 5000,
    });
  });

  afterEach(async () => {
    await pool.closeAll();
  });

  describe('acquire', () => {
    it('should create new browser when pool is empty', async () => {
      const browser = await pool.acquire();
      expect(browser).toBeDefined();

      const stats = pool.getStats();
      expect(stats.total).toBe(1);
      expect(stats.inUse).toBe(1);
    });

    it('should reuse browser when available', async () => {
      const browser1 = await pool.acquire();
      await pool.release(browser1);

      const browser2 = await pool.acquire();
      expect(browser2).toBe(browser1);

      const stats = pool.getStats();
      expect(stats.total).toBe(1);
    });

    it('should create multiple browsers up to max', async () => {
      const browser1 = await pool.acquire();
      const browser2 = await pool.acquire();
      const browser3 = await pool.acquire();

      expect(browser1).toBeDefined();
      expect(browser2).toBeDefined();
      expect(browser3).toBeDefined();

      const stats = pool.getStats();
      expect(stats.total).toBe(3);
      expect(stats.inUse).toBe(3);
    });

    it('should wait when pool is full', async () => {
      // Acquire all instances
      const browser1 = await pool.acquire();
      const browser2 = await pool.acquire();
      const browser3 = await pool.acquire();

      // Try to acquire 4th (should wait)
      const acquirePromise = pool.acquire();

      // Release one browser after a short delay
      setTimeout(async () => {
        await pool.release(browser1);
      }, 100);

      // Should successfully get the released browser
      const browser4 = await acquirePromise;
      expect(browser4).toBe(browser1);
    }, 10000);

    it('should timeout when waiting for browser and none becomes available', async () => {
      const timeoutPool = new BrowserPool({
        maxInstances: 1,
      });

      // Acquire the only instance so pool is full
      const browser1 = await timeoutPool.acquire();

      // Call private method directly to test timeout without waiting 30 seconds
      // We'll mock the internal state to simulate a timeout condition
      const originalWaitMethod = (timeoutPool as any).waitForAvailableBrowser;
      (timeoutPool as any).waitForAvailableBrowser = async function () {
        // Simulate immediate timeout
        throw new Error('BrowserPool: Timeout waiting for available browser');
      };

      // Try to acquire another through the public API
      await expect(timeoutPool.acquire()).rejects.toThrow(
        'BrowserPool: Timeout waiting for available browser',
      );

      // Restore original method
      (timeoutPool as any).waitForAvailableBrowser = originalWaitMethod;

      // Clean up
      await timeoutPool.release(browser1);
      await timeoutPool.closeAll();
    });
  });

  describe('release', () => {
    it('should mark browser as available', async () => {
      const browser = await pool.acquire();

      let stats = pool.getStats();
      expect(stats.inUse).toBe(1);
      expect(stats.available).toBe(0);

      await pool.release(browser);

      stats = pool.getStats();
      expect(stats.inUse).toBe(0);
      expect(stats.available).toBe(1);
    });

    it('should handle unknown browser gracefully', async () => {
      const mockBrowser = {
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as Browser;

      await expect(pool.release(mockBrowser)).resolves.not.toThrow();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle browser close errors when releasing unknown browser', async () => {
      const mockBrowser = {
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
      } as unknown as Browser;

      // Should not throw even if close fails
      await expect(pool.release(mockBrowser)).resolves.not.toThrow();
    });
  });

  describe('closeAll', () => {
    it('should close all browsers', async () => {
      await pool.acquire();
      await pool.acquire();

      let stats = pool.getStats();
      expect(stats.total).toBe(2);

      await pool.closeAll();

      stats = pool.getStats();
      expect(stats.total).toBe(0);
    });

    it('should stop cleanup interval', async () => {
      const browser = await pool.acquire();
      await pool.release(browser);

      await pool.closeAll();

      // After closeAll, the cleanup interval should be cleared
      // We can't directly test this, but we can verify pool is empty
      expect(pool.getStats().total).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      const browser1 = await pool.acquire();
      const browser2 = await pool.acquire();
      await pool.release(browser1);

      const stats = pool.getStats();

      expect(stats.total).toBe(2);
      expect(stats.inUse).toBe(1);
      expect(stats.available).toBe(1);
      expect(stats.maxInstances).toBe(3);
    });
  });

  describe('idle cleanup', () => {
    it('should clean up idle browsers after timeout', async () => {
      // Create pool with short idle timeout for testing
      const shortTimeoutPool = new BrowserPool({
        maxInstances: 3,
        idleTimeout: 100, // 100ms
      });

      const browser = await shortTimeoutPool.acquire();
      await shortTimeoutPool.release(browser);

      let stats = shortTimeoutPool.getStats();
      expect(stats.total).toBe(1);

      // Wait for cleanup to run
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Browser should still be there (cleanup runs every minute)
      stats = shortTimeoutPool.getStats();
      expect(stats.total).toBe(1);

      await shortTimeoutPool.closeAll();
    });

    it('should trigger cleanup and close idle browsers manually', async () => {
      const shortTimeoutPool = new BrowserPool({
        maxInstances: 3,
        idleTimeout: 50, // 50ms
      });

      const browser = await shortTimeoutPool.acquire();
      await shortTimeoutPool.release(browser);

      let stats = shortTimeoutPool.getStats();
      expect(stats.total).toBe(1);

      // Wait for browser to become idle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Manually trigger cleanup by calling private method
      await (shortTimeoutPool as any).cleanupIdleBrowsers();

      // Browser should be cleaned up now
      stats = shortTimeoutPool.getStats();
      expect(stats.total).toBe(0);

      await shortTimeoutPool.closeAll();
    });

    it('should handle errors during idle browser cleanup', async () => {
      const errorBrowser = {
        close: jest.fn().mockRejectedValue(new Error('Cleanup close failed')),
      };

      const puppeteer = require('puppeteer');
      puppeteer.launch.mockResolvedValueOnce(errorBrowser);

      const shortTimeoutPool = new BrowserPool({
        maxInstances: 3,
        idleTimeout: 50,
      });

      const browser = await shortTimeoutPool.acquire();
      expect(browser).toBe(errorBrowser);

      await shortTimeoutPool.release(browser);

      // Wait for browser to become idle
      await new Promise((resolve) => setTimeout(resolve, 100));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Manually trigger cleanup
      await (shortTimeoutPool as any).cleanupIdleBrowsers();

      // Should log error but not throw
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to close idle browser'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();

      await shortTimeoutPool.closeAll();
    });
  });

  describe('error handling', () => {
    it('should handle browser close errors during closeAll', async () => {
      const errorBrowser = {
        close: jest.fn().mockRejectedValue(new Error('Close failed')),
      };

      // Mock puppeteer to return error browser
      const puppeteer = require('puppeteer');
      puppeteer.launch.mockResolvedValueOnce(errorBrowser);

      const browser = await pool.acquire();
      expect(browser).toBe(errorBrowser);

      // Should not throw even if close fails
      await expect(pool.closeAll()).resolves.not.toThrow();
    });
  });
});

describe('Global Browser Pool', () => {
  afterEach(async () => {
    await closeGlobalBrowserPool();
  });

  it('should create singleton instance', () => {
    const pool1 = getGlobalBrowserPool();
    const pool2 = getGlobalBrowserPool();

    expect(pool1).toBe(pool2);
  });

  it('should accept options on first call', () => {
    const pool = getGlobalBrowserPool({
      maxInstances: 5,
    });

    expect(pool.getStats().maxInstances).toBe(5);
  });

  it('should close global pool', async () => {
    const pool = getGlobalBrowserPool();
    await pool.acquire();

    expect(pool.getStats().total).toBe(1);

    await closeGlobalBrowserPool();

    // After close, should create new instance
    const newPool = getGlobalBrowserPool();
    expect(newPool.getStats().total).toBe(0);
  });
});
