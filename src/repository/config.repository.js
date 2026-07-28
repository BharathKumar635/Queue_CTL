'use strict';

const { getDb } = require('../database/database');

function getConfig(key) {
  const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setConfig(key, value) {
  getDb().prepare(
    'INSERT OR REPLACE INTO config(key, value) VALUES (?, ?)'
  ).run(key, String(value));
}

function getAllConfig() {
  return getDb().prepare('SELECT key, value FROM config ORDER BY key').all();
}

module.exports = { getConfig, setConfig, getAllConfig };
