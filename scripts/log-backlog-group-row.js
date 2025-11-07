const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'goals.db');
const db = new Database(dbPath);

const logEntry = {
  id: randomUUID(),
  project_id: '4ee93a8c-9318-4497-b7cf-05027e48f12b',
  requirement_name: 'backlog-group-row-component',
  title: 'BacklogGroupRow UI Component',
  overview: `Implemented a reusable BacklogGroupRow component for rendering group headers in the Backlog sidebar and other group-based list interfaces. The component provides consistent visual hierarchy with Tailwind CSS styling, dark mode support, and full accessibility features.

Key features implemented:
- Created src/components/ui/backlog-group-row.tsx with TypeScript interface
- Added comprehensive props: id, name, itemCount, isSelected, isExpanded, showExpandButton, sortOrder, onClick, onToggleExpand, className, isLoading
- Implemented Tailwind classes for consistent padding, typography, and responsive design
- Added dark mode support with proper color transitions
- Included keyboard navigation with focus rings (focus:ring-2 focus:ring-cyan-500/50)
- Added ARIA attributes for screen readers (aria-pressed, aria-expanded, aria-label)
- Implemented data-testid attributes for all interactive elements
- Used cn() utility for conditional class merging
- Added ChevronUp/ChevronDown icons for expand/collapse functionality
- Exported component and types from src/components/ui/index.ts

The component follows the existing design patterns in the codebase with glassmorphism effects, cyan accent colors for selected states, and gray tones for inactive states. It supports both single-row selection and expandable group views, making it versatile for different sidebar layouts.`,
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

  console.log('✅ Implementation log entry created successfully');
  console.log(`   ID: ${logEntry.id}`);
  console.log(`   Title: ${logEntry.title}`);
} catch (error) {
  console.error('❌ Error creating implementation log entry:', error.message);
  process.exit(1);
} finally {
  db.close();
}
