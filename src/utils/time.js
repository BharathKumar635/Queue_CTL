'use strict';

/** Returns the current time as an ISO-8601 string */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Returns an ISO-8601 string `seconds` seconds in the future.
 * @param {number} seconds
 */
function addSeconds(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/**
 * Returns true if the given ISO timestamp is in the past (or null/undefined).
 * @param {string|null} isoTimestamp
 */
function isPast(isoTimestamp) {
  if (!isoTimestamp) return true;
  return new Date(isoTimestamp) <= new Date();
}

/**
 * Returns a threshold ISO string `ms` milliseconds in the past.
 * Useful for heartbeat stale-detection.
 * @param {number} ms
 */
function msAgo(ms) {
  return new Date(Date.now() - ms).toISOString();
}

module.exports = { nowIso, addSeconds, isPast, msAgo };
