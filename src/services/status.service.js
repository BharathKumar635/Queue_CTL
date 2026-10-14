import { countByState } from '../repository/job.repository.js';
import { getActiveWorkers } from '../repository/worker.repository.js';
import { listConfig } from './config.service.js';

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

export { getStatus };
