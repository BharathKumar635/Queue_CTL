import { Command } from 'commander';
import { enqueueJob } from '../services/queue.service.js';

function parseJsonPayload(raw) {
  let str = raw.trim();
  // Strip outer quotes if any
  if (
    (str.startsWith("'") && str.endsWith("'")) ||
    (str.startsWith('"') && str.endsWith('"'))
  ) {
    str = str.slice(1, -1);
  }
  try {
    return JSON.parse(str);
  } catch (_) {
    try {
      // 1. Replace single quotes with double quotes
      let fixed = str.replace(/'/g, '"');

      // 2. Ensure unquoted keys get double-quoted: {id: ...} -> {"id": ...}
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');

      // 3. Handle unquoted string values stripped by PowerShell / Windows shells:
      // e.g. "id":job-1 or "command":echo Hello World
      fixed = fixed.replace(/(":\s*)([a-zA-Z0-9_\-\s\.\/]+?)(?=\s*[,}])(?!\s*[:])/g, (match, prefix, val) => {
        const trimmed = val.trim();
        if (
          trimmed === 'true' ||
          trimmed === 'false' ||
          trimmed === 'null' ||
          (!isNaN(Number(trimmed)) && trimmed !== '')
        ) {
          return `${prefix}${trimmed}`;
        }
        return `${prefix}"${trimmed.replace(/"/g, '\\"')}"`;
      });

      return JSON.parse(fixed);
    } catch (e) {
      throw new Error(`Invalid JSON payload: ${e.message}`);
    }
  }
}

function createEnqueueCommand() {
  return new Command('enqueue')
    .description('Enqueue a new background job')
    .argument('<json_payload...>', 'JSON payload string')
    .action((jsonPayloadParts) => {
      try {
        const rawPayload = Array.isArray(jsonPayloadParts) ? jsonPayloadParts.join(' ') : jsonPayloadParts;
        const input = parseJsonPayload(rawPayload);
        const job = enqueueJob(input);
        console.log(`Job enqueued successfully: ${job.id}`);
      } catch (err) {
        console.error(`Enqueue failed: ${err.message}`);
        process.exit(1);
      }
    });
}

export { createEnqueueCommand, parseJsonPayload };
