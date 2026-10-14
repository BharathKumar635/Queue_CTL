import { createTestEnv } from '../helpers/test-utils.js';

describe('Scenario 3: Multi-worker Concurrency Safety', () => {
  let env;

  beforeEach(() => {
    env = createTestEnv('scenario3');
  });

  afterEach(() => {
    env.cleanup();
  });

  test('50 jobs across 3 parallel worker processes run exactly once with zero duplicates', async () => {
    const JOB_COUNT = 50;

    // Enqueue 50 jobs
    for (let i = 1; i <= JOB_COUNT; i++) {
      env.runCli(`enqueue '{"id":"multi-${i}","command":"echo job-${i}"}'`);
    }

    // Spawn 3 separate worker processes (simulating 3 terminal sessions)
    const worker1 = env.spawnWorker('worker start --count 2');
    const worker2 = env.spawnWorker('worker start --count 2');
    const worker3 = env.spawnWorker('worker start --count 2');

    // Wait until all 50 jobs are completed
    let completedCount = 0;
    for (let poll = 0; poll < 40; poll++) {
      await new Promise((r) => setTimeout(r, 500));
      const listRes = env.runCli('list --state completed --json');
      if (listRes.code === 0) {
        const completedJobs = JSON.parse(listRes.stdout);
        completedCount = completedJobs.length;
        if (completedCount >= JOB_COUNT) break;
      }
    }

    // Stop workers
    env.runCli('worker stop');
    worker1.kill();
    worker2.kill();
    worker3.kill();

    expect(completedCount).toBe(JOB_COUNT);

    // Verify state pending is 0, processing is 0
    const pending = JSON.parse(env.runCli('list --state pending --json').stdout);
    const processing = JSON.parse(env.runCli('list --state processing --json').stdout);
    expect(pending.length).toBe(0);
    expect(processing.length).toBe(0);

    // Verify all IDs from 1..50 exist in completed
    const completed = JSON.parse(env.runCli('list --state completed --json').stdout);
    const completedIds = new Set(completed.map((j) => j.id));
    expect(completedIds.size).toBe(JOB_COUNT);
  });
});
