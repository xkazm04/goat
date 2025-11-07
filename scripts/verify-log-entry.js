const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'goals.db');
const db = new Database(dbPath);

try {
  const stmt = db.prepare(`
    SELECT id, title, requirement_name, created_at
    FROM implementation_log
    WHERE requirement_name = ?
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const result = stmt.get('First-Use Guided Match Grid Tutorial');

  if (result) {
    console.log('✅ Log entry found:');
    console.log('   ID:', result.id);
    console.log('   Title:', result.title);
    console.log('   Requirement:', result.requirement_name);
    console.log('   Created:', result.created_at);
  } else {
    console.log('❌ No log entry found');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
