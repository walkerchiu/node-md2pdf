/**
 * Recent Files Manager
 * Manages the list of recently used files for Smart Conversion Mode
 */

import { promises as fs } from 'fs';
import { join } from 'path';

export interface RecentFile {
  path: string;
  lastUsed: Date;
  size?: number;
  type?: 'md' | 'markdown';
}

export interface RecentFilesConfig {
  maxFiles: number;
  files: RecentFile[];
}

export class RecentFilesManager {
  private readonly configDir: string;
  private readonly configFile: string;
  private readonly maxFiles: number = 10;
  private config: RecentFilesConfig | null = null;

  constructor() {
    this.configDir = process.cwd();
    this.configFile = join(this.configDir, 'recent-files.json');
  }

  /**
   * Add a file to recent files list
   */
  async addFile(filePath: string): Promise<void> {
    try {
      await this.ensureConfig();

      // Remove existing entry if it exists
      this.config!.files = this.config!.files.filter(
        (file) => file.path !== filePath,
      );

      // Get file stats
      let size: number | undefined;
      try {
        const stats = await fs.stat(filePath);
        size = stats.size;
      } catch {
        // File might not exist anymore, that's okay
      }

      // Add to the beginning of the list
      const recentFile: RecentFile = {
        path: filePath,
        lastUsed: new Date(),
        ...(size !== undefined && { size }),
        type: filePath.endsWith('.md') ? 'md' : 'markdown',
      };

      this.config!.files.unshift(recentFile);

      // Keep only maxFiles number of files
      this.config!.files = this.config!.files.slice(0, this.maxFiles);

      await this.saveConfig();
    } catch (error) {
      // Silently fail - recent files is a convenience feature
      console.warn(`Failed to add file to recent files: ${error}`);
    }
  }

  /**
   * Get list of recent files
   */
  async getRecentFiles(): Promise<RecentFile[]> {
    try {
      await this.ensureConfig();

      // Filter out files that no longer exist
      const validFiles: RecentFile[] = [];

      for (const file of this.config!.files) {
        try {
          await fs.access(file.path);
          validFiles.push(file);
        } catch {
          // File no longer exists, skip it
        }
      }

      // Update config if files were removed
      if (validFiles.length !== this.config!.files.length) {
        this.config!.files = validFiles;
        await this.saveConfig();
      }

      return validFiles;
    } catch (error) {
      console.warn(`Failed to get recent files: ${error}`);
      return [];
    }
  }

  /**
   * Clear all recent files
   */
  async clearRecentFiles(): Promise<void> {
    try {
      this.config = {
        maxFiles: this.maxFiles,
        files: [],
      };
      await this.saveConfig();
    } catch (error) {
      console.warn(`Failed to clear recent files: ${error}`);
    }
  }

  /**
   * Get recent file paths only
   */
  async getRecentFilePaths(): Promise<string[]> {
    const recentFiles = await this.getRecentFiles();
    return recentFiles.map((file) => file.path);
  }

  private async ensureConfig(): Promise<void> {
    if (this.config) return;

    try {
      // Ensure config directory exists
      await fs.mkdir(this.configDir, { recursive: true });

      // Try to load existing config
      try {
        const configContent = await fs.readFile(this.configFile, 'utf-8');
        const parsed = JSON.parse(configContent);

        // Convert date strings back to Date objects
        parsed.files = parsed.files.map((file: any) => ({
          ...file,
          lastUsed: new Date(file.lastUsed),
        }));

        this.config = parsed;
      } catch {
        // Config doesn't exist or is invalid, create new one
        this.config = {
          maxFiles: this.maxFiles,
          files: [],
        };
      }
    } catch (error) {
      // Fall back to empty config
      this.config = {
        maxFiles: this.maxFiles,
        files: [],
      };
    }
  }

  private async saveConfig(): Promise<void> {
    if (!this.config) return;

    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await fs.writeFile(
        this.configFile,
        JSON.stringify(this.config, null, 2),
        'utf-8',
      );
    } catch (error) {
      console.warn(`Failed to save recent files config: ${error}`);
    }
  }

  /**
   * Format file path for display
   */
  formatFilePath(filePath: string, maxLength: number = 60): string {
    if (filePath.length <= maxLength) {
      return filePath;
    }

    const parts = filePath.split('/');
    if (parts.length <= 2) {
      return filePath;
    }

    const fileName = parts[parts.length - 1];
    const parentDir = parts[parts.length - 2];

    const shortened = `.../${parentDir}/${fileName}`;
    if (shortened.length <= maxLength) {
      return shortened;
    }

    return `.../${fileName}`;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes?: number): string {
    if (!bytes) return '';

    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
  }

  /**
   * Format last used date for display
   */
  formatLastUsed(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

    return date.toLocaleDateString();
  }
}
