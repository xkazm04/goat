const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

const db = new Database('database/goals.db');

// First, check if table exists and its structure
console.log('Checking database structure...');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Check if implementation_log table exists
const hasTable = tables.some(t => t.name === 'implementation_log');
if (!hasTable) {
  console.error('ERROR: implementation_log table does not exist!');
  db.close();
  process.exit(1);
}

// Insert the log entry
const id = randomUUID();
const projectId = '4ee93a8c-9318-4497-b7cf-05027e48f12b';
const requirementName = 'add-experimental-dark-fallback-mechanism';
const title = 'Experimental Dark Theme Fallback';
const overview = 'Implemented comprehensive fallback mechanism for experimental-dark theme (Neon Truth) that gracefully degrades to standard dark theme on unsupported browsers. Created experimental-dark theme definition in globals.css using advanced CSS features (OKLCH color space, backdrop-filter) with @supports-based CSS fallback. Built theme-support.ts utility module with CSS.supports() API detection for runtime feature checking. Created use-theme-fallback.ts custom hook for automatic theme fallback management. Enhanced ThemeProvider component to detect and log CSS feature support on mount. Integrated ThemeProvider into root layout with experimental-dark theme configuration. The implementation ensures users on older browsers see a consistent dark theme instead of broken styles, improving reliability and user experience across all browser environments.';

try {
  db.prepare(`
    INSERT INTO implementation_log (
      id,
      project_id,
      requirement_name,
      title,
      overview,
      tested,
      created_at
    ) VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(id, projectId, requirementName, title, overview);

  console.log('✓ Implementation log entry created successfully!');
  console.log('  ID:', id);
  console.log('  Title:', title);

  // Verify it was created
  const result = db.prepare(`
    SELECT * FROM implementation_log
    WHERE id = ?
  `).get(id);

  if (result) {
    console.log('✓ Verified: Entry exists in database');
  }
} catch (error) {
  console.error('ERROR inserting log entry:', error.message);
  process.exit(1);
}

db.close();
