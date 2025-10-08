#!/usr/bin/env ts-node

/**
 * Clean test-generated files script
 * Run this script to clean up all test-generated files
 */

import path from 'path';
import { TestCleanup } from '../tests/utils/test-cleanup';

const directories = [
  path.join(__dirname, '../tests/fixtures/markdown'),
  path.join(__dirname, '../tests/temp'),
];

// eslint-disable-next-line no-console
console.log('🧹 Cleaning up test-generated files...');

let totalFiles = 0;
directories.forEach((dir) => {
  // eslint-disable-next-line no-console
  console.log(`📁 Checking directory: ${dir}`);

  // List files that will be cleaned up
  const testFiles = TestCleanup.listTestFiles(dir);
  if (testFiles.length > 0) {
    // eslint-disable-next-line no-console
    console.log('🗂️ Found test files to clean up:');
    // eslint-disable-next-line no-console
    testFiles.forEach((file) => console.log(`   - ${file}`));
    totalFiles += testFiles.length;
  }

  // Perform cleanup
  TestCleanup.cleanupTestFiles(dir);
});

// Also clean up entire temp directory if it exists
const tempDir = path.join(__dirname, '../tests/temp');
TestCleanup.cleanupTempDirectory(tempDir);

if (totalFiles === 0) {
  // eslint-disable-next-line no-console
  console.log('✨ No test files found to clean up');
}

// eslint-disable-next-line no-console
console.log('✅ Test file cleanup completed');
