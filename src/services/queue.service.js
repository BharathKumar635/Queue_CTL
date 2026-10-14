import {
  insertJob,
  claimNextJob,
  getJobById,
  getJobsByState,
  getAllJobs,
} from '../repository/job.repository.js';
import { createJob } from '../models/job.js';
import { validateJobInput } from '../utils/validator.js';
import { DuplicateJobError, JobNotFoundError } from '../utils/errors.js';
import { getMaxRetries } from './config.service.js';

/**
 * Validate, build, and persist a new job.
 * Uses the system max_retries config unless the caller supplies one.
 */
function enqueueJob(input) {
  validateJobInput(input);

  if (input.id && getJobById(input.id)) {
    throw new DuplicateJobError(`Job with id "${input.id}" already exists`);
  }

  const job = createJob(input, getMaxRetries());
  insertJob(job);
  return job;
}

/**
 * Atomically claim the next available job for a worker.
 * Delegates to the repository's BEGIN IMMEDIATE transaction.
 */
function claimJob(workerPid) {
  return claimNextJob(workerPid);
}

function getJob(id) {
  const job = getJobById(id);
  if (!job) throw new JobNotFoundError(`Job "${id}" not found`);
  return job;
}

function listJobs(state) {
  return state ? getJobsByState(state) : getAllJobs();
}

export { enqueueJob, claimJob, getJob, listJobs };
