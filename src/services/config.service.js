import { getConfig, setConfig, getAllConfig } from '../repository/config.repository.js';
import { CONFIG_SCHEMA, normalizeKey } from '../models/config.js';
import { ConfigError } from '../utils/errors.js';
import { DEFAULTS } from '../utils/constants.js';

function getConfigValue(key) {
  const dbKey = normalizeKey(key);
  const schema = CONFIG_SCHEMA[dbKey];
  if (!schema) throw new ConfigError(`Unknown config key: "${key}"`);

  const raw = getConfig(dbKey);
  if (raw === null) {
    // Fall back to the in-code default
    return dbKey === 'max_retries' ? DEFAULTS.MAX_RETRIES : DEFAULTS.BACKOFF_BASE;
  }
  return schema.type === 'integer' ? parseInt(raw, 10) : parseFloat(raw);
}

function setConfigValue(key, value) {
  const dbKey = normalizeKey(key);
  const schema = CONFIG_SCHEMA[dbKey];
  if (!schema) throw new ConfigError(`Unknown config key: "${key}". Allowed: max-retries, backoff-base`);

  const num = schema.type === 'integer' ? parseInt(value, 10) : parseFloat(value);
  if (isNaN(num) || num < schema.min) {
    throw new ConfigError(`"${key}" must be a ${schema.type} >= ${schema.min}, got: ${value}`);
  }

  setConfig(dbKey, String(num));
  return { key: dbKey, value: num };
}

function getMaxRetries()  { return getConfigValue('max_retries'); }
function getBackoffBase() { return getConfigValue('backoff_base'); }
function listConfig()     { return getAllConfig(); }

export { getConfigValue, setConfigValue, getMaxRetries, getBackoffBase, listConfig };
