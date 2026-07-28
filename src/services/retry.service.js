'use strict';

const { updateJob }     = require('../repository/job.repository');
const { getBackoffBase } = require('./config.service');
const { addSeconds }    = require('../utils/time');

/**
 * Backoff formula: delay = base ^ attempts  (seconds)
 * With base=2: 2s, 4s, 8s, 16s …
 *
 * @param {number} base
 * @param {number} attempts  number of completed failed attempts
 */
function calculateBackoffDelay(base, attempts) {
  return Math.pow(base, attempts);
}

/**
 * Record a successful execution: state → completed.
 */
function handleJobSuccess(job, output) {
  updateJob(job.id, {
    state:      'completed',
    output:     output || null,
    worker_pid: null,
    retry_after: null,
  });
}

/**
 * Record a failed execution and decide: retry or dead.
 *
 * Retry semantics (see DECISIONS.md Q3):
 *   - max_retries = N means the job gets N retry attempts after the initial run
 *   - If newAttempts > max_retries → dead (DLQ)
 *   - Otherwise           → failed, retry_after set to now + base^newAttempts seconds
 *
 * @returns {'failed'|'dead'}
 */
function handleJobFailure(job, output) {
  const newAttempts = job.attempts + 1;

  if (newAttempts > job.max_retries) {
    // All retries exhausted → Dead Letter Queue
    updateJob(job.id, {
      state:       'dead',
      attempts:    newAttempts,
      output:      output || null,
      worker_pid:  null,
      retry_after: null,
    });
    return 'dead';
  }

  // Schedule the next retry with exponential backoff
  const base        = getBackoffBase();
  const delaySecs   = calculateBackoffDelay(base, newAttempts);
  const retryAfter  = addSeconds(delaySecs);

  updateJob(job.id, {
    state:       'failed',
    attempts:    newAttempts,
    retry_after: retryAfter,
    output:      output || null,
    worker_pid:  null,
  });
  return 'failed';
}

module.exports = { handleJobSuccess, handleJobFailure, calculateBackoffDelay };
