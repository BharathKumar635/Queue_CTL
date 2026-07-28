'use strict';

const os        = require('os');
const { nowIso } = require('../utils/time');

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

module.exports = { createWorkerRecord };
