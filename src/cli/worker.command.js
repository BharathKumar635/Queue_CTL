'use strict';

const { Command } = require('commander');
const { startWorkers } = require('../worker/worker');
const { stopWorkers } = require('../services/worker.service');

function createWorkerCommand() {
  const workerCmd = new Command('worker')
    .description('Manage worker processes');

  workerCmd
    .command('start')
    .description('Start workers in the foreground (blocks until stopped)')
    .option('--count <n>', 'Number of worker loops to run concurrently', parseInt, 1)
    .action(async (options) => {
      try {
        await startWorkers({ count: options.count });
      } catch (err) {
        console.error(`Worker error: ${err.message}`);
        process.exit(1);
      }
    });

  workerCmd
    .command('stop')
    .description('Gracefully stop all running workers from another terminal')
    .action(() => {
      try {
        const { stopped, cleaned } = stopWorkers();
        if (stopped === 0 && cleaned === 0) {
          console.log('No active worker processes found.');
        } else {
          console.log(`Sent stop signal to ${stopped} worker process(es). Cleaned ${cleaned} stale PID file(s).`);
        }
      } catch (err) {
        console.error(`Stop failed: ${err.message}`);
        process.exit(1);
      }
    });

  return workerCmd;
}

module.exports = { createWorkerCommand };
