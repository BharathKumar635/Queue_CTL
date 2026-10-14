import { getJobsByState, updateJob, getJobById } from '../repository/job.repository.js';
import { JobNotFoundError } from '../utils/errors.js';

function listDeadJobs() {
  return getJobsByState('dead');
}

/**
 * Re-enqueue a dead job.
 *
 * Resets attempts to 0 (see DECISIONS.md Q3 for rationale).
 *
 * @param {string} id
 */
function retryDeadJob(id) {
  const job = getJobById(id);
  if (!job) throw new JobNotFoundError(`Job "${id}" not found`);
  if (job.state !== 'dead') {
    throw new Error(`Job "${id}" is not in the DLQ (current state: "${job.state}")`);
  }

  updateJob(id, {
    state:       'pending',
    attempts:    0,          // reset: operator wants a fresh retry budget
    retry_after: null,
    worker_pid:  null,
  });

  return getJobById(id);
}

export { listDeadJobs, retryDeadJob };
