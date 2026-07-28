'use strict';

const { insertJob, claimNextJob, getJobById, getJobsByState, getAllJobs } =
  require('../repository/job.repository');
const { createJob }                     = require('../models/job');
const { validateJobInput }              = require('../utils/validator');
const { DuplicateJobError, JobNotFoundError } = require('../utils/errors');
const { getMaxRetries }                 = require('./config.service');

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

module.exports = { enqueueJob, claimJob, getJob, listJobs };
