#!/usr/bin/env ts-node

/**
 * Clean test-generated files script
 * Run this script to clean up all test-generated files
 */

import path from 'path';
import { TestCleanup } from '../tests/utils/test-cleanup';

const fixturesDir = path.join(__dirname, '../tests/fixtures/markdown');

// eslint-disable-next-line no-console
console.log('🧹 Cleaning up test-generated files...');
// eslint-disable-next-line no-console
console.log(`📁 Checking directory: ${fixturesDir}`);

// List files that will be cleaned up
const testFiles = TestCleanup.listTestFiles(fixturesDir);
if (testFiles.length > 0) {
  // eslint-disable-next-line no-console
  console.log('🗂️ Found test files to clean up:');
  // eslint-disable-next-line no-console
  testFiles.forEach(file => console.log(`   - ${file}`));
  // eslint-disable-next-line no-console
  console.log();
} else {
  // eslint-disable-next-line no-console
  console.log('✨ No test files found to clean up');
}

// Perform cleanup
TestCleanup.cleanupTestFiles(fixturesDir);

// eslint-disable-next-line no-console
console.log('✅ Test file cleanup completed');
