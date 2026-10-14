import { nowIso } from '../utils/time.js';

/**
 * Generate a simple UUID v4 without external dependencies.
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Build a new job object with all required fields and defaults.
 *
 * @param {object} input
 * @param {string} [input.id]          - defaults to generated UUID
 * @param {string}  input.command      - required
 * @param {number} [input.max_retries] - overrides system default
 * @param {number}  defaultMaxRetries  - system config value
 */
function createJob({ id, command, max_retries }, defaultMaxRetries) {
  const now = nowIso();
  return {
    id:          (id && id.trim()) ? id.trim() : generateId(),
    command:     command.trim(),
    state:       'pending',
    attempts:    0,
    max_retries: max_retries !== undefined ? Number(max_retries) : defaultMaxRetries,
    created_at:  now,
    updated_at:  now,
    retry_after: null,
    worker_pid:  null,
    output:      null,
  };
}

export { createJob, generateId };
