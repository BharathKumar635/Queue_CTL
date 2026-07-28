'use strict';

const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BIN_PATH = path.join(__dirname, '../../bin/queuectl.js');

/**
 * Parses a CLI command string into an argv array preserving quoted arguments.
 */
function parseCommandString(cmdStr) {
  const args = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < cmdStr.length; i++) {
    const char = cmdStr[i];
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === ' ' && !inDouble && !inSingle) {
      if (current.length > 0) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current.length > 0) {
    args.push(current);
  }
  return args;
}

function createTestEnv(testName) {
  const dataDir = path.join(__dirname, `../../data/test-${testName}-${Date.now()}`);
  fs.mkdirSync(dataDir, { recursive: true });

  const env = {
    ...process.env,
    QUEUECTL_DATA_DIR: dataDir,
  };

  const runCli = (argsInput) => {
    const args = Array.isArray(argsInput) ? argsInput : parseCommandString(argsInput);
    const res = spawnSync(process.execPath, [BIN_PATH, ...args], {
      env,
      encoding: 'utf8',
    });
    return {
      code: res.status !== null ? res.status : 1,
      stdout: res.stdout || '',
      stderr: res.stderr || '',
    };
  };

  const spawnWorker = (argsInput = 'worker start') => {
    const args = Array.isArray(argsInput) ? argsInput : parseCommandString(argsInput);
    const proc = spawn(process.execPath, [BIN_PATH, ...args], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return proc;
  };

  const cleanup = () => {
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch (_) {}
  };

  return { dataDir, env, runCli, spawnWorker, cleanup };
}

module.exports = { createTestEnv, BIN_PATH, parseCommandString };
