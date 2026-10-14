import { claimJob } from '../services/queue.service.js';
import { handleJobSuccess, handleJobFailure } from '../services/retry.service.js';
import { executeCommand } from './executor.js';
import { registerWorker, deregisterWorker } from '../repository/worker.repository.js';
import { createWorkerRecord } from '../models/worker.js';
import { startHeartbeat, stopHeartbeat } from './heartbeat.js';
import { startRecovery, stopRecovery } from './recovery.js';
import { setupShutdown, isShuttingDown, onShutdown } from './shutdown.js';
import { writePidFile, deletePidFile } from '../services/worker.service.js';
import logger from '../utils/logger.js';
import { DEFAULTS } from '../utils/constants.js';

/**
 * Worker class representing a single execution thread/loop or worker manager.
 */
class WorkerRunner {
  constructor(options = {}) {
    this.count = options.count || DEFAULTS.WORKER_COUNT;
    this.pollIntervalMs = options.pollIntervalMs || DEFAULTS.POLL_INTERVAL_MS;
    this.pid = process.pid;
    this.heartbeatHandle = null;
    this.recoveryHandle = null;
    this.activeJobsCount = 0;
    this.running = false;
  }

  async start() {
    this.running = true;
    logger.info(`Starting worker manager (PID: ${this.pid}, threads/count: ${this.count})...`);

    // 1. Register worker process & PID file
    writePidFile(this.pid);
    registerWorker(createWorkerRecord(this.pid));

    // 2. Start heartbeat & recovery loops
    this.heartbeatHandle = startHeartbeat(this.pid);
    this.recoveryHandle = startRecovery();

    // 3. Setup shutdown signal handlers
    setupShutdown();
    onShutdown(async () => {
      this.running = false;
      // Wait for active in-flight jobs to complete
      while (this.activeJobsCount > 0) {
        logger.info(`Waiting for ${this.activeJobsCount} active job(s) to finish before shutdown...`);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Stop handles and cleanup
      stopHeartbeat(this.heartbeatHandle);
      stopRecovery(this.recoveryHandle);
      deregisterWorker(this.pid);
      deletePidFile(this.pid);
      logger.info(`Worker PID ${this.pid} clean shutdown complete.`);
    });

    // 4. Launch `this.count` parallel loop runners in this process
    const loops = [];
    for (let i = 0; i < this.count; i++) {
      loops.push(this.runWorkerLoop(i + 1));
    }

    // Keep process alive in foreground until stopped or signal received
    await Promise.all(loops);
  }

  async runWorkerLoop(workerNum) {
    logger.debug(`Worker loop #${workerNum} started.`);

    while (this.running && !isShuttingDown()) {
      let job = null;
      try {
        job = claimJob(this.pid);
      } catch (err) {
        logger.error(`Worker #${workerNum} claim error: ${err.message}`);
      }

      if (job) {
        this.activeJobsCount++;
        logger.info(`Worker #${workerNum} claimed job "${job.id}": command = "${job.command}"`);

        try {
          const { exitCode, output } = await executeCommand(job.command);

          if (exitCode === 0) {
            logger.info(`Job "${job.id}" succeeded (exit code 0).`);
            handleJobSuccess(job, output);
          } else {
            logger.warn(`Job "${job.id}" failed (exit code ${exitCode}).`);
            const status = handleJobFailure(job, output);
            logger.warn(`Job "${job.id}" updated to state "${status}".`);
          }
        } catch (err) {
          logger.error(`Error executing job "${job.id}": ${err.message}`);
          handleJobFailure(job, err.message);
        } finally {
          this.activeJobsCount--;
        }
      } else {
        // No job claimed, sleep before polling again
        await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      }
    }

    logger.debug(`Worker loop #${workerNum} exited.`);
  }
}

async function startWorkers(options) {
  const runner = new WorkerRunner(options);
  await runner.start();
}

export { WorkerRunner, startWorkers };
