import os from 'node:os';
import { nowIso } from '../utils/time.js';

/**
 * Build a worker registration record for the workers heartbeat table.
 * @param {number} pid
 */
function createWorkerRecord(pid) {
  const now = nowIso();
  return {
    pid,
    hostname:       os.hostname(),
    started_at:     now,
    last_heartbeat: now,
  };
}

export { createWorkerRecord };
