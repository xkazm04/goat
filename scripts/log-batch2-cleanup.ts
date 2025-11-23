#!/usr/bin/env tsx

/**
 * Script to log the unused code cleanup (batch 2) to the SQLite database
 * Usage: npx tsx scripts/log-batch2-cleanup.ts
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database', 'goals.db');
const PROJECT_ID = '4ee93a8c-9318-4497-b7cf-05027e48f12b';

// Initialize database
function initDatabase() {
  const db = new Database(DB_PATH);

  // Check if overview_bullets column exists, if not add it
  const tableInfo = db.prepare("PRAGMA table_info(implementation_log)").all() as any[];
  const hasOverviewBullets = tableInfo.some((col: any) => col.name === 'overview_bullets');

  if (!hasOverviewBullets) {
    db.exec(`ALTER TABLE implementation_log ADD COLUMN overview_bullets TEXT`);
    console.log('✅ Added overview_bullets column to implementation_log table');
  }

  return db;
}

// Log the cleanup implementation
function logImplementation() {
  const db = initDatabase();

  const id = randomUUID();
  const requirementName = 'unused-cleanup-1763915008218';
  const title = 'UI Component Cleanup Batch 2';
  const overview = `Completed verification and cleanup of 7 unused UI components identified by static analysis. Removed dialog.tsx (125 lines), dropdown-menu.tsx (203 lines), progress.tsx (28 lines), select.tsx (160 lines), sonner.tsx (31 lines), statistic-badge.tsx (249 lines), and toggle-group.tsx (61 lines), totaling ~857 lines of dead code. All components were confirmed unused through comprehensive static analysis including import checks, JSX usage verification, dynamic import detection, configuration file analysis, and barrel export validation. Created backup manifest at docs/cleanup/unused-files-backup-2025-11-23.json and detailed cleanup report at docs/cleanup/cleanup-report-2025-11-23-batch2.md. Git commit 46842de on branch cleanup/unused-components-2025-11-23. Build verification completed successfully (pre-existing build issues documented and unrelated to cleanup).`;

  const overviewBullets = `Removed 7 unused UI components: dialog, dropdown-menu, progress, select, sonner, statistic-badge, toggle-group
Deleted ~857 lines of dead code (52 unused exports removed)
Comprehensive verification: static imports, JSX usage, dynamic imports, config files, barrel exports
Created backup manifest and detailed cleanup report with impact analysis
Build verified - pre-existing errors documented as unrelated to cleanup`;

  const stmt = db.prepare(`
    INSERT INTO implementation_log (
      id,
      project_id,
      requirement_name,
      title,
      overview,
      overview_bullets,
      tested,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  try {
    stmt.run(id, PROJECT_ID, requirementName, title, overview, overviewBullets, 0);
    console.log('✅ Implementation logged successfully!');
    console.log(`   ID: ${id}`);
    console.log(`   Title: ${title}`);
    console.log(`   Requirement: ${requirementName}`);
    console.log(`   Lines removed: ~857`);
  } catch (error) {
    console.error('❌ Error logging implementation:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

logImplementation();
