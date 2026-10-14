import { getDb } from '../database/database.js';
import { nowIso } from '../utils/time.js';

/** Helper to execute a synchronous block inside a SQLite transaction */
function transaction(mode, fn) {
  const db = getDb();
  db.exec(`BEGIN ${mode}`);
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    throw err;
  }
}

// ─── Insert ───────────────────────────────────────────────────────────────────

function insertJob(job) {
  getDb().prepare(`
    INSERT INTO jobs
      (id, command, state, attempts, max_retries, created_at, updated_at, retry_after, worker_pid, output)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    job.id, job.command, job.state, job.attempts, job.max_retries,
    job.created_at, job.updated_at, job.retry_after, job.worker_pid, job.output
  );
  return job;
}

// ─── Atomic Claim ─────────────────────────────────────────────────────────────

/**
 * Atomically claim the next available job for a worker.
 *
 * Atomicity guarantee:
 *   We use BEGIN IMMEDIATE to acquire a write-lock upfront, preventing
 *   write-write conflicts entirely. Inside the transaction:
 *     1. SELECT the candidate job.
 *     2. UPDATE with a WHERE guard that re-checks the state.
 *   If result.changes === 0, another worker won the race; we return null.
 *
 * This exact pair of lines is the critical section (DECISIONS.md Q1):
 *   Line A — SELECT … LIMIT 1
 *   Line B — UPDATE … WHERE id = ? AND (state = 'pending' OR state = 'failed' …)
 *
 * @param {number} workerPid
 * @returns {object|null} claimed job row, or null if none available
 */
function claimNextJob(workerPid) {
  return transaction('IMMEDIATE', () => {
    const db  = getDb();
    const now = nowIso();

    // Line A — find the next job that is ready to run
    const job = db.prepare(`
      SELECT * FROM jobs
      WHERE (
        state = 'pending'
        OR (state = 'failed' AND retry_after IS NOT NULL AND retry_after <= ?)
      )
      ORDER BY created_at ASC
      LIMIT 1
    `).get(now);

    if (!job) return null;

    // Line B — conditional update; returns 0 changes if another worker got there first
    const result = db.prepare(`
      UPDATE jobs
      SET state = 'processing', worker_pid = ?, updated_at = ?
      WHERE id = ? AND (
        state = 'pending'
        OR (state = 'failed' AND retry_after IS NOT NULL AND retry_after <= ?)
      )
    `).run(workerPid, now, job.id, now);

    return result.changes === 1 ? job : null;
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

function getJobById(id) {
  return getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(id) ?? null;
}

function getJobsByState(state) {
  return getDb().prepare(
    'SELECT * FROM jobs WHERE state = ? ORDER BY created_at ASC'
  ).all(state);
}

function getAllJobs() {
  return getDb().prepare('SELECT * FROM jobs ORDER BY created_at ASC').all();
}

function countByState() {
  const rows = getDb().prepare(
    'SELECT state, COUNT(*) as count FROM jobs GROUP BY state'
  ).all();
  const counts = { pending: 0, processing: 0, completed: 0, failed: 0, dead: 0 };
  for (const { state, count } of rows) {
    counts[state] = Number(count);
  }
  return counts;
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * Update arbitrary columns on a job row.
 * Always bumps updated_at.
 *
 * @param {string} id
 * @param {object} updates  key→value pairs of columns to update
 */
function updateJob(id, updates) {
  const fields     = { ...updates, updated_at: nowIso() };
  const setClauses = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values     = [...Object.values(fields), id];
  getDb().prepare(`UPDATE jobs SET ${setClauses} WHERE id = ?`).run(...values);
}

// ─── Recovery ─────────────────────────────────────────────────────────────────

/**
 * Find all jobs stuck in 'processing' whose worker's heartbeat is older than
 * `heartbeatThreshold` (ISO string), and reset them to 'pending'.
 *
 * Called by recovery.js every RECOVERY_INTERVAL_MS.
 *
 * @param {string} heartbeatThreshold  ISO timestamp
 * @returns {number} count of recovered jobs
 */
function recoverOrphanedJobs(heartbeatThreshold) {
  return transaction('IMMEDIATE', () => {
    const db  = getDb();
    const now = nowIso();

    // A job is orphaned if its worker row is missing OR the heartbeat is stale.
    const orphaned = db.prepare(`
      SELECT j.* FROM jobs j
      LEFT JOIN workers w ON j.worker_pid = w.pid
      WHERE j.state = 'processing'
        AND (w.pid IS NULL OR w.last_heartbeat < ?)
    `).all(heartbeatThreshold);

    for (const job of orphaned) {
      db.prepare(`
        UPDATE jobs
        SET state = 'pending', worker_pid = NULL, updated_at = ?
        WHERE id = ? AND state = 'processing'
      `).run(now, job.id);
    }

    return orphaned.length;
  });
}

export {
  insertJob,
  claimNextJob,
  getJobById,
  getJobsByState,
  getAllJobs,
  countByState,
  updateJob,
  recoverOrphanedJobs,
};
