'use strict';

const { updateHeartbeat }  = require('../repository/worker.repository');
const logger               = require('../utils/logger');
const { DEFAULTS }         = require('../utils/constants');

/**
 * Start a repeating heartbeat that updates `workers.last_heartbeat` for `pid`.
 * The interval is unreffed so it does not prevent the process from exiting.
 *
 * @param {number} pid
 * @param {number} [intervalMs]
 * @returns {NodeJS.Timeout} handle for stopHeartbeat()
 */
function startHeartbeat(pid, intervalMs = DEFAULTS.HEARTBEAT_INTERVAL_MS) {
  const handle = setInterval(() => {
    try {
      updateHeartbeat(pid);
      logger.debug(`Heartbeat updated for PID ${pid}`);
    } catch (err) {
      logger.error(`Heartbeat failed for PID ${pid}: ${err.message}`);
    }
  }, intervalMs);

  if (handle.unref) handle.unref(); // don't block process exit
  return handle;
}

function stopHeartbeat(handle) {
  if (handle) clearInterval(handle);
}

module.exports = { startHeartbeat, stopHeartbeat };
