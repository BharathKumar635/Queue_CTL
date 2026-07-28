'use strict';

const { recoverOrphanedJobs } = require('../repository/job.repository');
const { cleanStaleWorkers }   = require('../repository/worker.repository');
const logger                  = require('../utils/logger');
const { DEFAULTS }            = require('../utils/constants');
const { msAgo }               = require('../utils/time');

/**
 * Start the recovery loop.
 *
 * Every `intervalMs` milliseconds:
 *   1. Remove worker rows with a stale heartbeat (older than `timeoutMs`).
 *   2. Reset any 'processing' jobs whose worker is now absent/stale → 'pending'.
 *
 * Crash-recovery walk-through (DECISIONS.md Q2):
 *   - A SIGKILL'd worker's heartbeat stops updating.
 *   - After timeoutMs (30 s) the heartbeat is considered stale.
 *   - The next recovery tick (≤ intervalMs = 15 s later) resets the job.
 *   - Worst-case delay: 30 + 15 = 45 s (well under the 60 s SLA).
 *
 * @param {number} [intervalMs]
 * @param {number} [timeoutMs]
 * @returns {NodeJS.Timeout}
 */
function startRecovery(
  intervalMs = DEFAULTS.RECOVERY_INTERVAL_MS,
  timeoutMs  = DEFAULTS.HEARTBEAT_TIMEOUT_MS
) {
  const handle = setInterval(() => {
    try {
      const threshold = msAgo(timeoutMs);

      const removedWorkers = cleanStaleWorkers(threshold);
      if (removedWorkers > 0) {
        logger.info(`Recovery: removed ${removedWorkers} stale worker record(s)`);
      }

      const recovered = recoverOrphanedJobs(threshold);
      if (recovered > 0) {
        logger.info(`Recovery: reset ${recovered} orphaned job(s) → pending`);
      }
    } catch (err) {
      logger.error(`Recovery scan error: ${err.message}`);
    }
  }, intervalMs);

  if (handle.unref) handle.unref();
  return handle;
}

function stopRecovery(handle) {
  if (handle) clearInterval(handle);
}

module.exports = { startRecovery, stopRecovery };
