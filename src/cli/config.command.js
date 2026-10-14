import { Command } from 'commander';
import { setConfigValue, getConfigValue, listConfig } from '../services/config.service.js';

function createConfigCommand() {
  const configCmd = new Command('config')
    .description('Manage queuectl configuration');

  configCmd
    .command('set <key> <value>')
    .description('Set a configuration setting (e.g. max-retries 3, backoff-base 2)')
    .action((key, value) => {
      try {
        const result = setConfigValue(key, value);
        console.log(`Config updated: ${result.key} = ${result.value}`);
      } catch (err) {
        console.error(`Config set error: ${err.message}`);
        process.exit(1);
      }
    });

  configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action((key) => {
      try {
        const val = getConfigValue(key);
        console.log(`${key}: ${val}`);
      } catch (err) {
        console.error(`Config get error: ${err.message}`);
        process.exit(1);
      }
    });

  configCmd
    .command('list')
    .description('List all configuration settings')
    .action(() => {
      try {
        const configs = listConfig();
        for (const { key, value } of configs) {
          console.log(`${key}: ${value}`);
        }
      } catch (err) {
        console.error(`Config list error: ${err.message}`);
        process.exit(1);
      }
    });

  return configCmd;
}

export { createConfigCommand };
