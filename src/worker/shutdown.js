'use strict';

const logger = require('../utils/logger');

let _shuttingDown = false;
const _callbacks  = [];

/** Returns true after a shutdown signal has been received. */
function isShuttingDown() {
  return _shuttingDown;
}

/**
 * Register an async callback to run during graceful shutdown.
 * Callbacks run in registration order.
 */
function onShutdown(fn) {
  _callbacks.push(fn);
}

async function gracefulShutdown(signal) {
  if (_shuttingDown) return; // idempotent
  _shuttingDown = true;

  logger.info(`Received ${signal} — finishing active jobs before exit…`);

  for (const fn of _callbacks) {
    try { await fn(); } catch (err) {
      logger.error(`Shutdown callback error: ${err.message}`);
    }
  }

  logger.info('Graceful shutdown complete.');
  process.exit(0);
}

/**
 * Register SIGTERM and SIGINT handlers.
 * Call once per worker process at startup.
 */
function setupShutdown() {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
}

module.exports = { setupShutdown, isShuttingDown, onShutdown };
