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
 *   const { connectionStringFromEnv } = require('./connection');
 *   const client = new Client({ connectionString: connectionStringFromEnv(process.env) });
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

module.exports = { connectionStringFromEnv, ENV_KEYS };
