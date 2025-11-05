const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'goals.db');
const db = new Database(dbPath);

const logEntry = {
  id: 'ea6c101d-c52a-4680-a78b-80058bceaa4e',
  project_id: '4ee93a8c-9318-4497-b7cf-05027e48f12b',
  requirement_name: 'extract-theme-aware-icon-component',
  title: 'Extract ThemeAwareIcon Component',
  overview: 'Created a reusable ThemeAwareIcon component that centralizes icon selection and animation logic based on the current theme. The component automatically switches between Sun (light), Moon (dark), and Palette (experimental-dark) icons with smooth rotation and scaling transitions. Updated ThemeToggle to use the new component, simplifying its implementation from using IconButton with manual icon states to a single ThemeAwareIcon component. Created src/components/theme/theme-aware-icon.tsx with full TypeScript support, props for custom icons and sizing, and comprehensive JSDoc documentation. Added index.ts export file for the theme module. Fixed pre-existing TypeScript errors in accordion.tsx and calendar.tsx components, and installed missing Radix UI dependencies to improve project build stability.',
  tested: 0
};

try {
  const stmt = db.prepare(`
    INSERT INTO implementation_log (id, project_id, requirement_name, title, overview, tested, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const result = stmt.run(
    logEntry.id,
    logEntry.project_id,
    logEntry.requirement_name,
    logEntry.title,
    logEntry.overview,
    logEntry.tested
  );

  console.log('✅ Implementation log entry created successfully!');
  console.log('📋 Log ID:', logEntry.id);
  console.log('📊 Changes:', result.changes);
} catch (error) {
  console.error('❌ Error creating log entry:', error.message);
  process.exit(1);
} finally {
  db.close();
}
