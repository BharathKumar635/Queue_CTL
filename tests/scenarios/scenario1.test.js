import { createTestEnv } from '../helpers/test-utils.js';

describe('Scenario 1: Basic Job Completion', () => {
  let env;

  beforeEach(() => {
    env = createTestEnv('scenario1');
  });

  afterEach(() => {
    env.cleanup();
  });

  test('A basic job enqueues, processes, and completes', async () => {
    // 1. Enqueue job
    const enqueueRes = env.runCli(`enqueue '{"id":"job-sc1","command":"echo Hello World"}'`);
    expect(enqueueRes.code).toBe(0);

    // Verify state is pending
    const pendingRes = env.runCli('list --state pending --json');
    expect(pendingRes.code).toBe(0);
    const pendingJobs = JSON.parse(pendingRes.stdout);
    expect(pendingJobs.length).toBe(1);
    expect(pendingJobs[0].id).toBe('job-sc1');

    // 2. Start worker process
    const workerProc = env.spawnWorker('worker start');

    // Wait for job to complete
    let completed = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const listRes = env.runCli('list --state completed --json');
      if (listRes.code === 0) {
        const jobs = JSON.parse(listRes.stdout);
        if (jobs.some((j) => j.id === 'job-sc1')) {
          completed = true;
          break;
        }
      }
    }

    // Stop worker
    env.runCli('worker stop');
    workerProc.kill();

    expect(completed).toBe(true);

    // Verify completed output
    const listRes = env.runCli('list --state completed --json');
    const jobs = JSON.parse(listRes.stdout);
    const job = jobs.find((j) => j.id === 'job-sc1');
    expect(job).toBeDefined();
    expect(job.state).toBe('completed');
    expect(job.output).toContain('Hello World');
  });
});
