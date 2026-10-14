import { ValidationError } from './errors.js';

const VALID_STATES = new Set(['pending', 'processing', 'completed', 'failed', 'dead']);

/**
 * Validate raw job input before enqueueing.
 * Throws ValidationError on any violation.
 */
function validateJobInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Job payload must be a JSON object');
  }
  if (!input.command || typeof input.command !== 'string' || !input.command.trim()) {
    throw new ValidationError('Job must have a non-empty "command" string');
  }
  if (input.id !== undefined) {
    if (typeof input.id !== 'string' || !input.id.trim()) {
      throw new ValidationError('"id" must be a non-empty string');
    }
  }
  if (input.max_retries !== undefined) {
    const mr = Number(input.max_retries);
    if (!Number.isInteger(mr) || mr < 0) {
      throw new ValidationError('"max_retries" must be a non-negative integer');
    }
  }
  return true;
}

/**
 * Validate --state filter value.
 */
function validateState(state) {
  if (!VALID_STATES.has(state)) {
    throw new ValidationError(
      `Invalid state "${state}". Valid values: ${[...VALID_STATES].join(', ')}`
    );
  }
}

export { validateJobInput, validateState, VALID_STATES };
