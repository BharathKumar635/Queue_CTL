'use strict';

const { countByState }    = require('../repository/job.repository');
const { getActiveWorkers } = require('../repository/worker.repository');
const { listConfig }       = require('./config.service');

/**
 * Aggregate status for the `queuectl status` command.
 */
function getStatus() {
  const jobCounts = countByState();
  const workers   = getActiveWorkers();
  const config    = listConfig();

  return {
    jobs: {
      total:      Object.values(jobCounts).reduce((a, b) => a + b, 0),
      ...jobCounts,
    },
    workers: {
      count: workers.length,
      pids:  workers.map((w) => w.pid),
    },
    config: config.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {}),
  };
}

module.exports = { getStatus };
