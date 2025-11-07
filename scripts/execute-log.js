const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/goals.db');
const db = new Database(dbPath);

const { randomUUID } = require('crypto');

const logEntry = {
  id: randomUUID(),
  project_id: '4ee93a8c-9318-4497-b7cf-05027e48f12b',
  requirement_name: 'fix-build-errors-src-components',
  title: 'Fix PageTransition Type Error',
  overview: `Fixed TypeScript type error in page-transition.tsx component. The error was on line 63 where the pageTransition object was not properly typed as Variants from framer-motion. Added explicit Variants type import and annotation to the pageTransition constant, resolving the TS2322 error. The component provides smooth page transitions with fade, slide, and blur effects for route changes in the Next.js application.`,
  tested: 0
};

try {
  const stmt = db.prepare(`
    INSERT INTO implementation_log (id, project_id, requirement_name, title, overview, tested, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  stmt.run(
    logEntry.id,
    logEntry.project_id,
    logEntry.requirement_name,
    logEntry.title,
    logEntry.overview,
    logEntry.tested
  );

  console.log('✅ Implementation log entry created successfully!');
  console.log(`📋 Entry ID: ${logEntry.id}`);
  console.log(`📝 Title: ${logEntry.title}`);
} catch (error) {
  console.error('❌ Error inserting log entry:', error.message);
  process.exit(1);
} finally {
  db.close();
}
