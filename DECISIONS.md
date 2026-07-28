# Architecture & Design Decisions — QueueCTL

This document explicitly details the architectural decisions, trade-offs, and design choices behind `queuectl`.

---

## Question 1: Atomic Job Claiming

**Which exact line(s) prevent two workers from claiming the same job, and why is that operation atomic across separate OS processes?**

### Exact Line Reference
The critical section resides in [`src/repository/job.repository.js`](file:///c:/Users/bhara/Desktop/Flam/src/repository/job.repository.js):

- **Line A (Select Candidate)**:
  ```js
  const job = db.prepare(`
    SELECT * FROM jobs
    WHERE (
      state = 'pending'
      OR (state = 'failed' AND retry_after IS NOT NULL AND retry_after <= ?)
    )
    ORDER BY created_at ASC
    LIMIT 1
  `).get(now);
  ```
- **Line B (Conditional Atomic Update)**:
  ```js
  const result = db.prepare(`
    UPDATE jobs
    SET state = 'processing', worker_pid = ?, updated_at = ?
    WHERE id = ? AND (
      state = 'pending'
      OR (state = 'failed' AND retry_after IS NOT NULL AND retry_after <= ?)
    )
  `).run(pid, now, job.id, now);
  ```
- **Transaction Block (Exclusive Lock)**:
  ```js
  return claimTx.immediate(workerPid); // Uses SQLite 'BEGIN IMMEDIATE' transaction
  ```

### Why it is atomic across separate OS processes:
1. **SQLite Database-Level Locking (`BEGIN IMMEDIATE`)**:  
   When `claimTx.immediate()` is invoked, `better-sqlite3` issues a `BEGIN IMMEDIATE` statement to SQLite. SQLite immediately acquires a **RESERVED / EXCLUSIVE lock** on the database file before executing any `SELECT` or `UPDATE`.
2. **Process Mutual Exclusion**:  
   If Worker Process 1 and Worker Process 2 simultaneously attempt to claim a job, SQLite's OS file-locking layer (`fcntl` locks on Unix, `LockFileEx` on Windows) serializes access. Worker 1 obtains the exclusive lock first; Worker 2 is queued or blocked until Worker 1 commits.
3. **Double Guarding (Optimistic Verification)**:  
   Inside the transaction, Worker 1 selects `job1` and immediately updates `state='processing'` where `id='job1' AND state IN ('pending', 'failed')`. When Worker 1 commits, `job1` state is changed to `processing`. When Worker 2 subsequently enters the transaction block, `job1` is no longer in `pending` state, so it selects the next available job or returns `null` if no jobs remain. `result.changes` will be `0` if another process updated it, preventing any race condition.

---

## Question 2: Crash Recovery Walkthrough (SIGKILL)

**A worker is SIGKILLed halfway through a job. Walk through, step by step, what state the job is in and how it eventually runs again. What is the worst-case delay before recovery?**

### Step-by-Step Walkthrough:
1. **At T=0 (Execution)**: Worker Process A claims Job `J100` (`state='processing'`, `worker_pid=1234`).
2. **At T=5s (SIGKILL Event)**: An external `kill -9 1234` or kernel OOM killer fires. Because `SIGKILL` cannot be caught or handled by process signal handlers, Process A terminates instantaneously.
   - `worker_pid=1234` leaves Job `J100` in `state='processing'`.
   - PID file `1234.pid` remains uncleaned on disk.
   - Heartbeat updates from Process A (`workers` table column `last_heartbeat`) cease immediately.
3. **At T=5s to T=35s (Stale Detection Window)**:
   - Live Worker Process B continues executing its background recovery loop (`src/worker/recovery.js`), which runs every **15 seconds**.
   - Heartbeats expire after **30 seconds** (`HEARTBEAT_TIMEOUT_MS = 30_000`).
4. **At T=35s (Recovery Sweep)**:
   - Worker Process B runs `cleanStaleWorkers(threshold)`:
     ```sql
     DELETE FROM workers WHERE last_heartbeat < (now - 30s);
     ```
     This deletes the worker row for PID `1234`.
   - Worker Process B runs `recoverOrphanedJobs(threshold)`:
     ```sql
     UPDATE jobs
     SET state = 'pending', worker_pid = NULL, updated_at = NOW
     WHERE state = 'processing'
       AND (worker_pid NOT IN (SELECT pid FROM workers));
     ```
   - Job `J100` transitions from `processing` → `pending`.
5. **At T=36s (Re-claiming & Execution)**:
   - On the next polling cycle, any available worker claims Job `J100` from `pending` and re-executes its command to completion.

### Worst-case delay before recovery:
$$\text{Worst Case} = \text{Heartbeat Timeout} + \text{Recovery Poll Interval} = 30\text{s} + 15\text{s} = 45\text{ seconds}$$
This satisfies the requirements enforced by automated test suites (< 60 seconds).

---

## Question 3: DLQ Retry Semantics (`attempts` Reset)

**Does `dlq retry <id>` reset `attempts`? Why is that the right call?**

### Answer:
**Yes**, `dlq retry <id>` resets `attempts` to **`0`**.

### Rationale & Justification:
1. **Operator Intent**:  
   Moving a job to the Dead Letter Queue (DLQ) signifies that all automated attempts (`max_retries`) have failed and human intervention was required (e.g., fixing a network endpoint, deploying a bug fix, or updating permissions). When an operator manually triggers `queuectl dlq retry <id>`, they are declaring: *"The underlying cause of failure has been fixed; retry this job with full retry budget."*
2. **Avoiding Immediate DLQ Bounce**:  
   If `attempts` were preserved at `attempts = max_retries + 1` (e.g., 3), a single transient failure during the manual retry would immediately cause `newAttempts > max_retries`, throwing the job back into the DLQ without giving it the benefit of exponential backoff retries.
3. **Clean Retry Budget**:  
   Resetting `attempts = 0` provides the job with its full `max_retries` allocation again, ensuring standard exponential backoff retries take place if a transient glitch occurs post-fix.

---

## Question 4: Worker Stop (Cross-Process Signaling) Design Alternatives

**What designs did you consider and reject for `worker stop` (cross-process signaling), and why?**

### Considered & Evaluated Options:

| Design Option | Mechanism | Decision | Reason for Rejection / Acceptance |
|---|---|---|---|
| **1. PID File + `SIGTERM` (Chosen)** | Workers write PID to `data/pids/<pid>.pid`. `worker stop` reads files and calls `process.kill(pid, 'SIGTERM')`. | **ACCEPTED** | **Simple, OS-native, reliable across Unix/macOS/Windows environments.** Zero extra network ports or socket dependencies. Graceful handling via standard Node `SIGTERM` listeners. |
| **2. Database Control Flag / State Table** | Workers poll a `system_control` DB table. `worker stop` sets `shutdown_requested = 1`. | **REJECTED** | **High Latency & Ineffective on Long-running Jobs.** If a job takes 60 seconds, the worker cannot react to the DB flag until the job finishes anyway. Signals interrupt sleeping loops instantly. |
| **3. IPC Unix Domain Socket / Named Pipes** | Primary worker process listens on UDS (`/tmp/queuectl.sock`). `worker stop` connects and sends a `STOP` command. | **REJECTED** | **Over-engineered & Cross-platform Fragility.** Named pipes on Windows (`\\.\pipe\...`) behave differently than POSIX sockets, introducing OS-specific edge cases without tangible benefits over OS signals. |
| **4. HTTP / REST Management Server** | Start an Express / Fastify HTTP server inside the worker process on a localhost port. | **REJECTED** | **Port Conflicts & Dependency Bloat.** Requiring dedicated TCP ports creates collision issues when running multiple instances or tests in parallel. |

---

## Question 5: Future Priority Queue Support

**If priorities were added tomorrow (high-priority jobs jump the queue), which parts of your design survive unchanged and which break?**

### What Survives Unchanged (80% of system):
- **Worker Execution Loop (`src/worker/worker.js`)**: Worker loops claim a job and run it — they do not care how the job was chosen.
- **Heartbeat & Crash Recovery (`src/worker/recovery.js`)**: Orphaned job detection and heartbeat timeout mechanics remain identical.
- **DLQ & Retry Logic (`src/services/retry.service.js`)**: Exponential backoff formulas, attempt counting, and DLQ promotion remain unchanged.
- **Worker Stop & Signal Handling (`src/services/worker.service.js`)**: Process management and shutdown signals remain untouched.
- **CLI Subcommand Structure (`src/cli/`)**: Overall CLI parsing and interface contracts remain backward compatible.

### What Breaks & Requires Modification (20% of system):
1. **Database Schema (`src/database/schema.sql`)**:  
   - Need a new `priority INTEGER NOT NULL DEFAULT 0` column in the `jobs` table (e.g., 0=low, 10=normal, 100=high).
   - Need an updated composite index: `CREATE INDEX idx_jobs_priority ON jobs(priority DESC, created_at ASC);`
2. **Job Claim Query (`src/repository/job.repository.js`)**:  
   - `claimNextJob` query must update its `ORDER BY` clause:
     ```sql
     -- Old
     ORDER BY created_at ASC
     -- New
     ORDER BY priority DESC, created_at ASC
     ```
3. **Enqueue API & CLI (`src/cli/enqueue.command.js`)**:  
   - `queuectl enqueue` schema validation must accept an optional `priority` parameter in the JSON payload (or via `--priority` flag).
