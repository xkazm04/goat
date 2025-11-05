#!/usr/bin/env tsx

/**
 * Script to log implementation completion to the SQLite database
 * Usage: npx tsx scripts/log-implementation.ts
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database', 'goals.db');
const PROJECT_ID = '4ee93a8c-9318-4497-b7cf-05027e48f12b';

// Initialize database and create table if it doesn't exist
function initDatabase() {
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS implementation_log (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      requirement_name TEXT NOT NULL,
      title TEXT NOT NULL,
      overview TEXT NOT NULL,
      tested INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  return db;
}

// Log the current implementation
function logImplementation() {
  const db = initDatabase();

  const id = randomUUID();
  const requirementName = 'centralize-animation-utilities';
  const title = 'Centralize Animation Utilities';
  const overview = `Created a centralized animation utilities file (src/lib/utils/animations.ts) that consolidates repeated CSS animation class strings used across UI components. The utilities file provides organized exports for data-state animations (fade, fadeZoom, fadeZoomSlide, fadeZoomSlideCenter), accordion animations (down, up), transition utilities (all, colors, opacity, transform), duration utilities (fast, default, medium, slow), and animation presets for common use cases (dialogOverlay, dialogContent, dropdownContent, hoverTransition, focusTransition, surfaceTransition). Updated 8 UI components to import and use these centralized animation utilities: dialog.tsx, dropdown-menu.tsx, popover.tsx, alert-dialog.tsx, tooltip.tsx, hover-card.tsx, context-menu.tsx, and menubar.tsx. This eliminates duplication of long animation class strings (such as data-[state=open]:animate-in data-[state=closed]:animate-out...), ensures consistent animation behavior across the UI, simplifies maintenance, reduces the chance of typos, and makes it easier to tweak global animation settings. The implementation follows existing Tailwind CSS and Radix UI patterns, maintains full TypeScript type safety with exported types (DataStateAnimation, AccordionAnimation, Transition, Duration, AnimationPreset), and includes a combineAnimations() helper function for composing multiple animation classes together.`;

  const stmt = db.prepare(`
    INSERT INTO implementation_log (
      id,
      project_id,
      requirement_name,
      title,
      overview,
      tested,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  try {
    stmt.run(id, PROJECT_ID, requirementName, title, overview, 0);
    console.log('✅ Implementation logged successfully!');
    console.log(`   ID: ${id}`);
    console.log(`   Title: ${title}`);
    console.log(`   Requirement: ${requirementName}`);
  } catch (error) {
    console.error('❌ Error logging implementation:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

logImplementation();
