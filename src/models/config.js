/**
 * Schema for the config table.
 * cliKey  = the key the user types (with dashes)
 * dbKey   = the key stored in the DB (with underscores)
 */
const CONFIG_SCHEMA = {
  max_retries: {
    dbKey:       'max_retries',
    cliKey:      'max-retries',
    type:        'integer',
    min:         0,
    description: 'Maximum retry attempts before a job is moved to the DLQ',
  },
  backoff_base: {
    dbKey:       'backoff_base',
    cliKey:      'backoff-base',
    type:        'number',
    min:         1,
    description: 'Exponential backoff base (delay = base ^ attempts seconds)',
  },
};

/** Normalise CLI key (with dashes) to DB key (with underscores). */
function normalizeKey(key) {
  return key.replace(/-/g, '_');
}

export { CONFIG_SCHEMA, normalizeKey };
