# QueueCTL — CLI Background Job Queue System

`queuectl` is a production-grade, CLI-based background job queue manager built in Node.js with SQLite persistence. It features parallel worker management, exponential backoff retries, a Dead Letter Queue (DLQ), and automated crash recovery for `SIGKILL` scenarios.

---

## Features

- **CLI-driven**: Enqueue jobs, manage workers, inspect queue status, and query the DLQ via clean commands.
- **SQLite Persistence**: Powered by SQLite in WAL (Write-Ahead Logging) mode — zero external service dependencies (no Redis required).
- **Atomic Job Claims**: Uses SQLite `BEGIN IMMEDIATE` transactions to guarantee that no job is executed more than once across parallel processes.
- **Crash-Resilient**: Heartbeat monitoring automatically detects crashed or `SIGKILL`ed workers and recovers orphaned jobs in ≤ 45 seconds (under the 60s SLA).
- **Configurable Exponential Backoff**: Retries failed jobs with $delay = base^{attempts}$ seconds delay.
- **DLQ Management**: Retain dead jobs after retries are exhausted and retry them manually.

---

## Prerequisites

- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later

---

## Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/queuectl.git
   cd queuectl
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Link CLI globally** (optional, enables running `queuectl` directly from any terminal):
   ```bash
   npm link
   ```
   *(Or run commands using `npx queuectl` or `./bin/queuectl.js`)*

---

## Usage Examples

### 1. Enqueue Jobs
Enqueue a new job by providing a JSON string payload:
```bash
queuectl enqueue '{"id":"job-1","command":"echo Hello World"}'
queuectl enqueue '{"id":"job-2","command":"sleep 3"}'
```

### 2. Start Workers
Start workers in the foreground (blocks until stopped or interrupted with Ctrl+C / SIGTERM):
```bash
# Start 1 worker thread (default)
queuectl worker start

# Start 3 worker threads in parallel
queuectl worker start --count 3
```

### 3. Stop Workers
Gracefully stop all running workers from another terminal:
```bash
queuectl worker stop
```

### 4. Queue Status & Summary
View a summary of all job states, active workers, and current config:
```bash
queuectl status
```

### 5. List Jobs
List jobs by state:
```bash
# Human-readable list
queuectl list --state pending
queuectl list --state completed

# Machine-readable JSON array (strictly prints JSON array to stdout)
queuectl list --state pending --json
```

### 6. Dead Letter Queue (DLQ)
View dead jobs and manually re-enqueue them:
```bash
# List all dead jobs
queuectl dlq list

# Re-enqueue a job from DLQ
queuectl dlq retry job-1
```

### 7. Configuration Management
Configure retry counts and exponential backoff base:
```bash
queuectl config set max-retries 5
queuectl config set backoff-base 2
queuectl config list
```

---

## Architecture Overview

```
queuectl/
├── bin/
│   └── queuectl.js          # CLI entry point
├── src/
│   ├── cli/                 # Commander subcommands
│   ├── worker/              # Worker loop, executor, heartbeat, recovery, shutdown
│   ├── services/            # Business logic (queue, retry, dlq, worker, status, config)
│   ├── repository/          # SQLite database queries & atomic transactions
│   ├── database/            # Connection singleton, schema, migration
│   ├── models/              # Job, Worker, and Config domain models
│   └── utils/               # Logger, validator, time helpers, errors, constants
├── data/                    # SQLite database storage (queue.db)
├── logs/                    # Worker logs (worker.log)
├── tests/                   # Scenario and unit test suites
├── DECISIONS.md             # Detailed architectural decision document
└── README.md
```

### Key Technical Mechanisms

1. **Atomic Claiming**: `claimNextJob` uses SQLite `BEGIN IMMEDIATE` transactions along with a guarded `UPDATE ... WHERE id=? AND state='pending'` to prevent two workers from claiming the same job across processes.
2. **Heartbeat & Recovery**: Each worker process writes a heartbeat timestamp to SQLite every 10 seconds. If a worker is `SIGKILL`ed, its heartbeat becomes stale (>30s). The recovery loop detects stale heartbeats every 15s and resets abandoned `processing` jobs back to `pending`.
3. **Graceful Shutdown**: On `SIGTERM` / `SIGINT`, workers finish in-flight jobs before deregistering and exiting cleanly.

---

## Running Automated Tests

Run the automated test suite covering all 5 core evaluation scenarios:

```bash
npm test
```

To run scenario tests specifically:
```bash
npm run test:scenarios
```

### Verified Scenarios:
1. `scenario1.test.js`: A basic job completes successfully.
2. `scenario2.test.js`: A failing job retries with backoff and moves to DLQ.
3. `scenario3.test.js`: 50 jobs across 3 parallel worker processes — every job runs exactly once.
4. `scenario4.test.js`: Worker SIGKILLed mid-job; recovers and completes without being stuck.
5. `scenario5.test.js`: Jobs persist and run across full system restart.

---

## Demo Recording

- **Demo Video Link**: [Insert YouTube / Loom / Drive Demo Link Here]

---

## License

MIT License
