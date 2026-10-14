import { updateHeartbeat } from '../repository/worker.repository.js';
import logger from '../utils/logger.js';
import { DEFAULTS } from '../utils/constants.js';

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

export { startHeartbeat, stopHeartbeat };
