import { Command } from 'commander';
import { listJobs } from '../services/queue.service.js';
import { validateState } from '../utils/validator.js';

function createListCommand() {
  return new Command('list')
    .description('List jobs by state')
    .requiredOption('--state <state>', 'State filter (pending, processing, completed, failed, dead)')
    .option('--json', 'Output strictly JSON array of job objects')
    .action((options) => {
      try {
        validateState(options.state);
        const rawJobs = listJobs(options.state);

        // Format job object strictly according to spec interface contract
        const jobs = rawJobs.map((j) => ({
          id: j.id,
          command: j.command,
          state: j.state,
          attempts: j.attempts,
          max_retries: j.max_retries,
          created_at: j.created_at,
          updated_at: j.updated_at,
          ...(j.retry_after ? { retry_after: j.retry_after } : {}),
          ...(j.worker_pid !== null ? { worker_pid: j.worker_pid } : {}),
          ...(j.output !== null ? { output: j.output } : {}),
        }));

        if (options.json) {
          // Strictly JSON array output to stdout (nothing else)
          console.log(JSON.stringify(jobs, null, 2));
        } else {
          if (jobs.length === 0) {
            console.log(`No jobs found with state "${options.state}".`);
            return;
          }
          console.log(`Jobs with state "${options.state}" (${jobs.length}):`);
          for (const j of jobs) {
            console.log(`  ID:          ${j.id}`);
            console.log(`  Command:     ${j.command}`);
            console.log(`  Attempts:    ${j.attempts}/${j.max_retries}`);
            console.log(`  Created:     ${j.created_at}`);
            console.log(`  Updated:     ${j.updated_at}`);
            if (j.output) console.log(`  Output:      ${j.output}`);
            console.log('  ---');
          }
        }
      } catch (err) {
        if (options.json) {
          // In case of error when --json is specified, print error to stderr and exit non-zero
          process.stderr.write(`Error: ${err.message}\n`);
        } else {
          console.error(`List failed: ${err.message}`);
        }
        process.exit(1);
      }
    });
}

export { createListCommand };
