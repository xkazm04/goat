#!/usr/bin/env node
/**
 * Logger Export Verification Script
 *
 * Verifies that the logger module exports all required functions and loggers.
 * Run with: node scripts/verify-logger.js
 *
 * This script checks:
 * - LOG-02: Debug API initialization function exists
 * - LOG-03: shouldLog function for level filtering exists
 * - LOG-04: Category loggers are exported
 */

const fs = require('fs');
const path = require('path');

const LOGGER_INDEX = path.join(__dirname, '../src/lib/logger/index.ts');
const DEBUG_CONFIG = path.join(__dirname, '../src/lib/logger/debug-config.ts');

let passed = 0;
let failed = 0;

function check(description, condition) {
  if (condition) {
    console.log(`  [PASS] ${description}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${description}`);
    failed++;
  }
}

function fileContains(filepath, pattern) {
  const content = fs.readFileSync(filepath, 'utf8');
  return content.includes(pattern);
}

function fileContainsRegex(filepath, regex) {
  const content = fs.readFileSync(filepath, 'utf8');
  return regex.test(content);
}

console.log('\n=== Logger Export Verification ===\n');

// Check files exist
console.log('File existence:');
check('src/lib/logger/index.ts exists', fs.existsSync(LOGGER_INDEX));
check('src/lib/logger/debug-config.ts exists', fs.existsSync(DEBUG_CONFIG));

// Check LOG-02: Runtime debug toggles
console.log('\nLOG-02 - Runtime debug toggles:');
check('initializeDebugAPI exported from index', fileContains(LOGGER_INDEX, 'export { shouldLog, getDebugConfig, initializeDebugAPI }'));
check('__DEBUG_GOAT__ type declared in debug-config', fileContains(DEBUG_CONFIG, '__DEBUG_GOAT__'));
check('enable function in DebugAPI', fileContainsRegex(DEBUG_CONFIG, /enable:\s*\(category:\s*LogCategory\)/));
check('disable function in DebugAPI', fileContainsRegex(DEBUG_CONFIG, /disable:\s*\(category:\s*LogCategory\)/));
check('enableAll function in DebugAPI', fileContainsRegex(DEBUG_CONFIG, /enableAll:\s*\(\)/));
check('disableAll function in DebugAPI', fileContainsRegex(DEBUG_CONFIG, /disableAll:\s*\(\)/));
check('status function in DebugAPI', fileContainsRegex(DEBUG_CONFIG, /status:\s*\(\)/));

// Check LOG-03: Log level filtering
console.log('\nLOG-03 - Log level filtering:');
check('LogLevel type defined', fileContainsRegex(DEBUG_CONFIG, /type\s+LogLevel\s*=\s*['"]debug['"]\s*\|\s*['"]info['"]\s*\|\s*['"]warn['"]\s*\|\s*['"]error['"]/));
check('setLevel function in DebugAPI', fileContainsRegex(DEBUG_CONFIG, /setLevel:\s*\(level:\s*LogLevel\)/));
check('LOG_LEVEL_PRIORITY defined', fileContains(DEBUG_CONFIG, 'LOG_LEVEL_PRIORITY'));
check('shouldLog checks level priority', fileContains(DEBUG_CONFIG, 'LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY'));

// Check LOG-04: Category-based filtering
console.log('\nLOG-04 - Category-based filtering:');
const categories = ['grid', 'session', 'dnd', 'validation', 'tier', 'backlog', 'match', 'consensus', 'heatmap', 'list', 'api'];
categories.forEach(cat => {
  check(`${cat}Logger exported`, fileContainsRegex(LOGGER_INDEX, new RegExp(`export\\s+const\\s+${cat}Logger\\s*=`)));
});
check('createCategoryLogger exported', fileContains(LOGGER_INDEX, 'export function createCategoryLogger'));

// Check auto-initialization
console.log('\nAuto-initialization:');
check('Debug API auto-initializes on client', fileContains(LOGGER_INDEX, "if (typeof window !== 'undefined')"));
check('initializeDebugAPI called at module load', fileContains(LOGGER_INDEX, 'initializeDebugAPI()'));

// Check shouldLog function
console.log('\nCore shouldLog function:');
check('shouldLog exported from debug-config', fileContains(DEBUG_CONFIG, 'export function shouldLog'));
check('shouldLog has fast path for disabled', fileContains(DEBUG_CONFIG, 'if (!debugConfig.enabled) return false'));
check('shouldLog checks category wildcard', fileContains(DEBUG_CONFIG, "debugConfig.categories.has('*')"));

// Summary
console.log('\n=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  console.log('\n[ERROR] Some checks failed. Review logger implementation.');
  process.exit(1);
} else {
  console.log('\n[SUCCESS] All logger exports verified.');
  process.exit(0);
}
