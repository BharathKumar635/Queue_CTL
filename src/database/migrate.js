import fs from 'node:fs';
import path from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from './database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Run the SQL schema file against the current DB connection.
 * Safe to call multiple times — all statements use CREATE IF NOT EXISTS / INSERT OR IGNORE.
 */
function migrate() {
  const db     = getDb();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

export { migrate };
