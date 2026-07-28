'use strict';

const fs   = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOGS_DIR, 'worker.log');

let _stream = null;

function getStream() {
  if (!_stream) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    _stream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  }
  return _stream;
}

function formatLine(level, message) {
  return `[${new Date().toISOString()}] [${level.toUpperCase().padEnd(5)}] ${message}`;
}

function write(level, message) {
  const line = formatLine(level, message);
  // All diagnostic output goes to stderr so stdout stays clean for --json
  process.stderr.write(line + '\n');
  try { getStream().write(line + '\n'); } catch (_) { /* ignore */ }
}

const logger = {
  info:  (msg) => write('info',  msg),
  warn:  (msg) => write('warn',  msg),
  error: (msg) => write('error', msg),
  debug: (msg) => { if (process.env.QUEUECTL_DEBUG) write('debug', msg); },
};

module.exports = logger;
