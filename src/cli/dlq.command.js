import { Command } from 'commander';
import { listDeadJobs, retryDeadJob } from '../services/dlq.service.js';

function createDlqCommand() {
  const dlqCmd = new Command('dlq')
    .description('Manage Dead Letter Queue (DLQ) jobs');

  dlqCmd
    .command('list')
    .description('View all dead jobs in the DLQ')
    .option('--json', 'Output strictly JSON array of job objects')
    .action((options) => {
      try {
        const rawJobs = listDeadJobs();
        const jobs = rawJobs.map((j) => ({
          id: j.id,
          command: j.command,
          state: j.state,
          attempts: j.attempts,
          max_retries: j.max_retries,
          created_at: j.created_at,
          updated_at: j.updated_at,
          ...(j.output !== null ? { output: j.output } : {}),
        }));

        if (options.json) {
          console.log(JSON.stringify(jobs, null, 2));
        } else {
          if (jobs.length === 0) {
            console.log('Dead Letter Queue is empty.');
            return;
          }
          console.log(`DLQ Jobs (${jobs.length}):`);
          for (const j of jobs) {
            console.log(`  ID:       ${j.id}`);
            console.log(`  Command:  ${j.command}`);
            console.log(`  Attempts: ${j.attempts}/${j.max_retries}`);
            if (j.output) console.log(`  Output:   ${j.output}`);
            console.log('  ---');
          }
        }
      } catch (err) {
        console.error(`DLQ list error: ${err.message}`);
        process.exit(1);
      }
    });

  dlqCmd
    .command('retry <id>')
    .description('Re-enqueue a dead job from the DLQ')
    .action((id) => {
      try {
        const job = retryDeadJob(id);
        console.log(`Job "${job.id}" re-enqueued successfully (state set to pending, attempts reset to 0).`);
      } catch (err) {
        console.error(`DLQ retry error: ${err.message}`);
        process.exit(1);
      }
    });

  return dlqCmd;
}

export { createDlqCommand };
