#!/usr/bin/env node

// Suppress Node.js ExperimentalWarning messages (e.g. for node:sqlite)
process.env.NODE_NO_WARNINGS = '1';
const emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, typeOrOptions, code, ctor) => {
  const type = typeof typeOrOptions === 'string' ? typeOrOptions : typeOrOptions?.type;
  if (type === 'ExperimentalWarning') return;
  emitWarning(warning, typeOrOptions, code, ctor);
};

const { buildProgram } = await import('../src/cli/index.js');

const program = buildProgram();
program.parse(process.argv);
