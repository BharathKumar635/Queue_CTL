class QueueError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class JobNotFoundError extends QueueError {}
class ValidationError extends QueueError {}
class DuplicateJobError extends QueueError {}
class WorkerError extends QueueError {}
class ConfigError extends QueueError {}

export {
  QueueError,
  JobNotFoundError,
  ValidationError,
  DuplicateJobError,
  WorkerError,
  ConfigError,
};
