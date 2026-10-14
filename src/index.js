import { migrate } from './database/migrate.js';
export * from './services/queue.service.js';
export * from './services/dlq.service.js';
export * from './services/worker.service.js';
export * from './services/status.service.js';
export * from './services/config.service.js';
export { startWorkers, WorkerRunner } from './worker/worker.js';

// Run migrations on import
migrate();
