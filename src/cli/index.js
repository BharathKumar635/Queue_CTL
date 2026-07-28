'use strict';

const { Command } = require('commander');
const { migrate } = require('../database/migrate');
const { createEnqueueCommand } = require('./enqueue.command');
const { createWorkerCommand } = require('./worker.command');
const { createStatusCommand } = require('./status.command');
const { createListCommand } = require('./list.command');
const { createDlqCommand } = require('./dlq.command');
const { createConfigCommand } = require('./config.command');

function buildProgram() {
  // Ensure DB migrations have run before any command executes
  migrate();

  const program = new Command('queuectl')
    .version('1.0.0')
    .description('QueueCTL — CLI background job queue system');

  program.addCommand(createEnqueueCommand());
  program.addCommand(createWorkerCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createListCommand());
  program.addCommand(createDlqCommand());
  program.addCommand(createConfigCommand());

  return program;
}

module.exports = { buildProgram };
