#!/usr/bin/env node
'use strict';

// Suppress Node.js ExperimentalWarning messages (e.g. for node:sqlite)
process.env.NODE_NO_WARNINGS = '1';

const { buildProgram } = require('../src/cli/index');

const program = buildProgram();
program.parse(process.argv);
