import { getDb } from '../database/database.js';
import { nowIso } from '../utils/time.js';

function registerWorker(record) {
  getDb().prepare(`
    INSERT OR REPLACE INTO workers (pid, hostname, started_at, last_heartbeat)
    VALUES (?, ?, ?, ?)
  `).run(record.pid, record.hostname, record.started_at, record.last_heartbeat);
}

function deregisterWorker(pid) {
  getDb().prepare('DELETE FROM workers WHERE pid = ?').run(pid);
}

function updateHeartbeat(pid) {
  getDb().prepare(
    'UPDATE workers SET last_heartbeat = ? WHERE pid = ?'
  ).run(nowIso(), pid);
}

function getActiveWorkers() {
  return getDb().prepare(
    'SELECT * FROM workers ORDER BY started_at ASC'
  ).all();
}

function getWorkerCount() {
  return getDb().prepare('SELECT COUNT(*) as c FROM workers').get().c;
}

/**
 * Delete worker rows whose heartbeat is older than `threshold`.
 * Called before recoverOrphanedJobs so orphan detection sees a clean table.
 *
 * @param {string} threshold  ISO timestamp
 * @returns {number} rows deleted
 */
function cleanStaleWorkers(threshold) {
  return getDb().prepare(
    'DELETE FROM workers WHERE last_heartbeat < ?'
  ).run(threshold).changes;
}

export {
  registerWorker,
  deregisterWorker,
  updateHeartbeat,
  getActiveWorkers,
  getWorkerCount,
  cleanStaleWorkers,
};
