/**
 * File system management types
 */

export interface IFileSystemManager {
  // File operations
  readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer>;
  writeFile(filePath: string, content: string | Buffer, options?: WriteFileOptions): Promise<void>;
  appendFile(filePath: string, content: string | Buffer): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  moveFile(source: string, destination: string): Promise<void>;
  deleteFile(filePath: string): Promise<void>;

  // Directory operations
  createDirectory(dirPath: string): Promise<void>;
  deleteDirectory(dirPath: string, recursive?: boolean): Promise<void>;
  listDirectory(dirPath: string): Promise<DirectoryItem[]>;

  // Path operations
  exists(path: string): Promise<boolean>;
  isFile(path: string): Promise<boolean>;
  isDirectory(path: string): Promise<boolean>;
  getStats(path: string): Promise<FileStats>;
  resolvePath(...paths: string[]): string;
  getAbsolutePath(path: string): string;
  getBaseName(path: string, ext?: string): string;
  getDirName(path: string): string;
  getExtension(path: string): string;

  // Utility operations
  createTempFile(prefix?: string, suffix?: string): Promise<string>;
  createTempDirectory(prefix?: string): Promise<string>;
  getFileSize(filePath: string): Promise<number>;
  getModificationTime(filePath: string): Promise<Date>;
}

export interface WriteFileOptions {
  encoding?: BufferEncoding;
  mode?: string | number;
  flag?: string;
}

export interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modified: Date;
}

export interface FileStats {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isFile: boolean;
  isDirectory: boolean;
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
}
