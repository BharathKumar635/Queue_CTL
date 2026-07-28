'use strict';

const fs      = require('fs');
const path    = require('path');
const { getPidsDir } = require('../database/database');
const logger  = require('../utils/logger');

// ─── PID file helpers ─────────────────────────────────────────────────────────

function writePidFile(pid) {
  const dir = getPidsDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${pid}.pid`), String(pid), 'utf8');
}

function deletePidFile(pid) {
  try { fs.unlinkSync(path.join(getPidsDir(), `${pid}.pid`)); } catch (_) { /* already gone */ }
}

function readPidFiles() {
  const dir = getPidsDir();
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.pid'))
      .map((f) => ({ file: path.join(dir, f), pid: parseInt(f, 10) }))
      .filter((e) => !isNaN(e.pid));
  } catch { return []; }
}

function isProcessAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// ─── Stop workers ─────────────────────────────────────────────────────────────

/**
 * Read all PID files and send SIGTERM to each live worker process.
 * Cleans up stale PID files for dead processes.
 *
 * @returns {{ stopped: number, cleaned: number }}
 */
function stopWorkers() {
  const entries = readPidFiles();

  if (entries.length === 0) return { stopped: 0, cleaned: 0 };

  let stopped = 0;
  let cleaned = 0;

  for (const { file, pid } of entries) {
    if (!isProcessAlive(pid)) {
      logger.warn(`Worker PID ${pid} is not running — removing stale PID file`);
      try { fs.unlinkSync(file); } catch (_) {}
      cleaned++;
      continue;
    }

    try {
      process.kill(pid, 'SIGTERM');
      logger.info(`Sent SIGTERM to worker PID ${pid}`);
      stopped++;
    } catch (err) {
      logger.error(`Failed to signal PID ${pid}: ${err.message}`);
      try { fs.unlinkSync(file); } catch (_) {}
    }
  }

  return { stopped, cleaned };
}

/**
 * Return PIDs of currently live worker processes (from PID files).
 */
function getLiveWorkerPids() {
  return readPidFiles()
    .map((e) => e.pid)
    .filter((pid) => isProcessAlive(pid));
}

module.exports = { writePidFile, deletePidFile, stopWorkers, getLiveWorkerPids };
