#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database', 'goals.db');

const db = new Database(DB_PATH);

const logs = db.prepare(`
  SELECT * FROM implementation_log
  WHERE requirement_name = 'page-transition-animations'
`).all();

console.log('Implementation log entries:');
console.log(JSON.stringify(logs, null, 2));

db.close();
