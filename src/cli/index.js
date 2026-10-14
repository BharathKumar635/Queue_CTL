import { Command } from 'commander';
import { migrate } from '../database/migrate.js';
import { createEnqueueCommand } from './enqueue.command.js';
import { createWorkerCommand } from './worker.command.js';
import { createStatusCommand } from './status.command.js';
import { createListCommand } from './list.command.js';
import { createDlqCommand } from './dlq.command.js';
import { createConfigCommand } from './config.command.js';

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

export { buildProgram };
