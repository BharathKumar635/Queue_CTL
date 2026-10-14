import { createTestEnv } from '../helpers/test-utils.js';

describe('Scenario 4: Crash Recovery after SIGKILL', () => {
  let testEnv;

  beforeEach(() => {
    testEnv = createTestEnv('scenario4');
    // Set fast recovery and heartbeat timeouts for testing
    testEnv.env.QUEUECTL_HEARTBEAT_TIMEOUT_MS = '2000';
    testEnv.env.QUEUECTL_RECOVERY_INTERVAL_MS = '1000';
    testEnv.env.QUEUECTL_HEARTBEAT_INTERVAL_MS = '500';
    testEnv.env.QUEUECTL_POLL_INTERVAL_MS = '500';
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  test('Worker SIGKILLed mid-job recovers within recovery window and job completes', async () => {
    // Enqueue a job that takes 5 seconds to run
    const sleepCmd = process.platform === 'win32'
      ? 'powershell -Command "Start-Sleep -Seconds 5"'
      : 'sleep 5';

    testEnv.runCli(['enqueue', JSON.stringify({ id: 'crash-job', command: sleepCmd })]);

    // Start worker process
    const workerProc = testEnv.spawnWorker('worker start');

    // Wait until job enters processing state
    let isProcessing = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const listRes = testEnv.runCli('list --state processing --json');
      if (listRes.code === 0 && listRes.stdout.trim()) {
        const jobs = JSON.parse(listRes.stdout);
        if (jobs.some((j) => j.id === 'crash-job')) {
          isProcessing = true;
          break;
        }
      }
    }

    expect(isProcessing).toBe(true);

    // SIGKILL the worker process abruptly (no cleanup handlers run)
    workerProc.kill('SIGKILL');

    // Job is initially stuck in processing right after SIGKILL
    const immediateProcessingRes = testEnv.runCli('list --state processing --json');
    const immediateJobs = JSON.parse(immediateProcessingRes.stdout);
    expect(immediateJobs.some((j) => j.id === 'crash-job')).toBe(true);

    // Now start a new worker. Its recovery loop will detect stale heartbeat and recover the job
    const newWorker = testEnv.spawnWorker('worker start');

    // Wait for the new worker to recover and complete the job
    let completed = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const compRes = testEnv.runCli('list --state completed --json');
      if (compRes.code === 0 && compRes.stdout.trim()) {
        const jobs = JSON.parse(compRes.stdout);
        if (jobs.some((j) => j.id === 'crash-job')) {
          completed = true;
          break;
        }
      }
    }

    testEnv.runCli('worker stop');
    newWorker.kill();

    expect(completed).toBe(true);

    // Verify nothing is stuck in processing
    const finalProcessing = JSON.parse(testEnv.runCli('list --state processing --json').stdout);
    expect(finalProcessing.length).toBe(0);
  }, 30000);
});
