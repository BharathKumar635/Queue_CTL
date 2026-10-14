import { spawn } from 'node:child_process';

/**
 * Execute a shell command and return its exit code and combined output.
 *
 * Uses `{shell: true}` so Node.js picks the platform shell:
 *   - Unix: /bin/sh
 *   - Windows: cmd.exe (or COMSPEC)
 *
 * @param {string} command  The shell command to run
 * @returns {Promise<{exitCode: number, output: string}>}
 */
function executeCommand(command) {
  return new Promise((resolve) => {
    const proc = spawn(command, [], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.stderr.on('data', (d) => { output += d.toString(); });

    proc.on('close', (code) => {
      resolve({ exitCode: code ?? 1, output: output.trim() });
    });

    proc.on('error', (err) => {
      // command-not-found, permission denied, etc.
      resolve({ exitCode: 1, output: `Execution error: ${err.message}` });
    });
  });
}

export { executeCommand };
