'use strict';

/** All valid job lifecycle states */
const JOB_STATES = Object.freeze({
  PENDING:    'pending',
  PROCESSING: 'processing',
  COMPLETED:  'completed',
  FAILED:     'failed',
  DEAD:       'dead',
});

/** Canonical keys used in the config table */
const CONFIG_KEYS = Object.freeze({
  MAX_RETRIES:  'max_retries',
  BACKOFF_BASE: 'backoff_base',
});

/** System-wide defaults (overridable via ENV for tests) */
const DEFAULTS = Object.freeze({
  MAX_RETRIES:           3,
  BACKOFF_BASE:          2,
  POLL_INTERVAL_MS:      process.env.QUEUECTL_POLL_INTERVAL_MS ? Number(process.env.QUEUECTL_POLL_INTERVAL_MS) : 1_000,
  HEARTBEAT_INTERVAL_MS: process.env.QUEUECTL_HEARTBEAT_INTERVAL_MS ? Number(process.env.QUEUECTL_HEARTBEAT_INTERVAL_MS) : 10_000,
  RECOVERY_INTERVAL_MS:  process.env.QUEUECTL_RECOVERY_INTERVAL_MS ? Number(process.env.QUEUECTL_RECOVERY_INTERVAL_MS) : 15_000,
  HEARTBEAT_TIMEOUT_MS:  process.env.QUEUECTL_HEARTBEAT_TIMEOUT_MS ? Number(process.env.QUEUECTL_HEARTBEAT_TIMEOUT_MS) : 30_000,
  WORKER_COUNT:          1,
});

module.exports = { JOB_STATES, CONFIG_KEYS, DEFAULTS };
