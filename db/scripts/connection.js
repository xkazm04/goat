/**
 * Database connection for the ad-hoc seed / maintenance scripts in db/scripts.
 *
 * ONE door for the connection string (registry: browser-credential-boundary /
 * public-vs-server-env-split). Until 2026-09-05 each of the three scripts
 * carried the pooler URL — project ref, role AND password — as a string
 * literal committed in 4d4c14c. A credential in a tracked file is a
 * credential in every clone, fork and CI log forever; this module reads it
 * from the environment and refuses to run without it, the same way
 * scripts/seed-e2e.ts refuses without its keys.
 *
 * Usage from a script:
 *   const { resolveConnectionString } = require('./connection');
 *   const client = new Client({ connectionString: resolveConnectionString(process.env) });
 *
 * Load the variable from .env without exporting it:
 *   node --env-file=.env db/scripts/<script>.js
 */

const ENV_KEYS = ['DATABASE_URL', 'SUPABASE_DB_URL'];

/**
 * Return the connection string from the first of DATABASE_URL / SUPABASE_DB_URL
 * that is set and non-empty. Throws — never falls back to a literal — when
 * neither is set, naming both keys and how to load them.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
function connectionStringFromEnv(env) {
  for (const key of ENV_KEYS) {
    const value = env[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  throw new Error(
    `No database connection string: set ${ENV_KEYS.join(' or ')} ` +
      '(e.g. `node --env-file=.env db/scripts/<script>.js`). ' +
      'The scripts never embed a credential; see db/README.md.',
  );
}

const REMOTE_FLAG = 'DB_SCRIPTS_ALLOW_REMOTE';
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i;

/**
 * Refuse a non-local target unless the operator says so explicitly.
 *
 * Mirror of scripts/seed-e2e.ts (E2E_SEED_ALLOW_REMOTE): every script in this
 * directory WRITES — deletes list_items, rewrites view_count, inserts users —
 * and until 2026-09-05 each pointed, unguarded, at the production pooler. A
 * localhost / 127.0.0.1 / ::1 host needs no flag; anything else needs
 * DB_SCRIPTS_ALLOW_REMOTE=1. Returns the connection string unchanged.
 *
 * @param {string} connectionString
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
function assertTargetAllowed(connectionString, env) {
  let host;
  try {
    host = new URL(connectionString).hostname;
  } catch {
    throw new Error('DATABASE_URL is not a parseable URL (expected a postgresql:// URL with user, password, host, port and database)');
  }
  if (LOCAL_HOST.test(host)) return connectionString;
  if (env[REMOTE_FLAG] === '1') return connectionString;
  throw new Error(
    `Refusing to run against non-local database host "${host}". ` +
      `These scripts write; if you mean it, set ${REMOTE_FLAG}=1.`,
  );
}

/**
 * The one call a script makes: read the URL from env, then apply the guard.
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
function resolveConnectionString(env) {
  return assertTargetAllowed(connectionStringFromEnv(env), env);
}

module.exports = { connectionStringFromEnv, assertTargetAllowed, resolveConnectionString, ENV_KEYS, REMOTE_FLAG };
