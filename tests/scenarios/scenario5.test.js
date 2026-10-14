import { createTestEnv } from '../helpers/test-utils.js';

describe('Scenario 5: Persistence Across Full System Restart', () => {
  let env;

  beforeEach(() => {
    env = createTestEnv('scenario5');
  });

  afterEach(() => {
    env.cleanup();
  });

  test('Jobs enqueued before process restart remain intact and execute after restart', async () => {
    // 1. Enqueue 3 jobs without running any worker
    env.runCli(`enqueue '{"id":"persist-1","command":"echo P1"}'`);
    env.runCli(`enqueue '{"id":"persist-2","command":"echo P2"}'`);
    env.runCli(`enqueue '{"id":"persist-3","command":"echo P3"}'`);

    // Verify 3 pending jobs
    let pending = JSON.parse(env.runCli('list --state pending --json').stdout);
    expect(pending.length).toBe(3);

    // 2. Simulate complete system shutdown (no process running)
    // All CLI calls exit. Now start a worker in a fresh process invocation.
    const worker = env.spawnWorker('worker start');

    // Wait until all 3 jobs complete
    let completed = 0;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const comp = JSON.parse(env.runCli('list --state completed --json').stdout);
      completed = comp.length;
      if (completed === 3) break;
    }

    env.runCli('worker stop');
    worker.kill();

    expect(completed).toBe(3);
  });
});
