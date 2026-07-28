'use strict';

const { migrate } = require('./database/migrate');
const queueService = require('./services/queue.service');
const dlqService = require('./services/dlq.service');
const workerService = require('./services/worker.service');
const statusService = require('./services/status.service');
const configService = require('./services/config.service');
const { startWorkers, WorkerRunner } = require('./worker/worker');

// Run migrations on require
migrate();

module.exports = {
  ...queueService,
  ...dlqService,
  ...workerService,
  ...statusService,
  ...configService,
  startWorkers,
  WorkerRunner,
};
