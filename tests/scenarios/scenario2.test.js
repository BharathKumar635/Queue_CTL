import { createTestEnv } from '../helpers/test-utils.js';

describe('Scenario 2: Retries and DLQ Promotion', () => {
  let env;

  beforeEach(() => {
    env = createTestEnv('scenario2');
  });

  afterEach(() => {
    env.cleanup();
  });

  test('Failing job retries with backoff and moves to DLQ after max_retries', async () => {
    // Set config: max-retries 2, backoff-base 1 (1s for fast testing)
    env.runCli('config set max-retries 2');
    env.runCli('config set backoff-base 1');

    // Enqueue job that fails
    env.runCli(`enqueue '{"id":"fail-job","command":"node -e \\"process.exit(1)\\""}'`);

    // Start worker
    const workerProc = env.spawnWorker('worker start');

    // Wait until it reaches DLQ (dead state)
    let inDlq = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const dlqRes = env.runCli('dlq list --json');
      if (dlqRes.code === 0) {
        const deadJobs = JSON.parse(dlqRes.stdout);
        if (deadJobs.some((j) => j.id === 'fail-job')) {
          inDlq = true;
          break;
        }
      }
    }

    env.runCli('worker stop');
    workerProc.kill();

    expect(inDlq).toBe(true);

    // Verify attempts count equals max_retries + 1 (initial run + 2 retries = 3 attempts total)
    const dlqRes = env.runCli('dlq list --json');
    const deadJobs = JSON.parse(dlqRes.stdout);
    const job = deadJobs.find((j) => j.id === 'fail-job');
    expect(job.attempts).toBe(3);

    // Test DLQ retry
    const retryRes = env.runCli('dlq retry fail-job');
    expect(retryRes.code).toBe(0);

    const pendingRes = env.runCli('list --state pending --json');
    const pendingJobs = JSON.parse(pendingRes.stdout);
    const retriedJob = pendingJobs.find((j) => j.id === 'fail-job');
    expect(retriedJob).toBeDefined();
    expect(retriedJob.attempts).toBe(0);
  });
});
