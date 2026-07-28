'use strict';

const fs     = require('fs');
const path   = require('path');
const { getDb } = require('./database');

/**
 * Run the SQL schema file against the current DB connection.
 * Safe to call multiple times — all statements use CREATE IF NOT EXISTS / INSERT OR IGNORE.
 */
function migrate() {
  const db     = getDb();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
}

module.exports = { migrate };
