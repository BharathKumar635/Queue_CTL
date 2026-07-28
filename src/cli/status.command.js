'use strict';

const { Command } = require('commander');
const { getStatus } = require('../services/status.service');

function createStatusCommand() {
  return new Command('status')
    .description('Summary of all job states & active workers')
    .action(() => {
      try {
        const status = getStatus();
        console.log('=== QueueCTL Status ===');
        console.log('\nJob States:');
        console.log(`  Pending:    ${status.jobs.pending}`);
        console.log(`  Processing: ${status.jobs.processing}`);
        console.log(`  Completed:  ${status.jobs.completed}`);
        console.log(`  Failed:     ${status.jobs.failed}`);
        console.log(`  Dead (DLQ): ${status.jobs.dead}`);
        console.log(`  Total:      ${status.jobs.total}`);

        console.log('\nActive Workers:');
        console.log(`  Count: ${status.workers.count}`);
        if (status.workers.count > 0) {
          console.log(`  PIDs:  ${status.workers.pids.join(', ')}`);
        }

        console.log('\nConfiguration:');
        for (const [k, v] of Object.entries(status.config)) {
          console.log(`  ${k}: ${v}`);
        }
      } catch (err) {
        console.error(`Status error: ${err.message}`);
        process.exit(1);
      }
    });
}

module.exports = { createStatusCommand };
