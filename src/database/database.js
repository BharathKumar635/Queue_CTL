'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs        = require('fs');
const pathMod   = require('path');

/**
 * Resolve the data directory.
 * Override with QUEUECTL_DATA_DIR env var (used by tests for isolation).
 */
function getDataDir() {
  return process.env.QUEUECTL_DATA_DIR
    ? process.env.QUEUECTL_DATA_DIR
    : pathMod.join(__dirname, '../../data');
}

function getPidsDir() {
  return pathMod.join(getDataDir(), 'pids');
}

function getDbPath() {
  return pathMod.join(getDataDir(), 'queue.db');
}

// Singleton connection per process
let _db = null;

/**
 * Returns the shared SQLite Database connection for this process.
 * Creates the data directory and opens the DB if not already open.
 */
function getDb() {
  if (!_db) {
    const dataDir = getDataDir();
    fs.mkdirSync(dataDir,       { recursive: true });
    fs.mkdirSync(getPidsDir(),  { recursive: true });

    _db = new DatabaseSync(getDbPath());

    // WAL mode: concurrent readers + serialised writers.
    // busy_timeout: writers retry for 5 s before giving SQLITE_BUSY.
    _db.exec('PRAGMA journal_mode = WAL');
    _db.exec('PRAGMA foreign_keys = ON');
    _db.exec('PRAGMA busy_timeout = 5000');
    _db.exec('PRAGMA synchronous = NORMAL');
  }
  return _db;
}

function closeDb() {
  if (_db) {
    try { _db.close(); } catch (_) { /* ignore */ }
    _db = null;
  }
}

module.exports = { getDb, closeDb, getDataDir, getPidsDir, getDbPath };
