/**
 * Regenerate docs/STORE_DEPENDENCY_GRAPH.md from the live store manifest.
 *
 *   npm run docs:store-graph          # write the doc
 *   npm run docs:store-graph -- --check   # exit 1 if the doc is stale
 *
 * The manifest in src/stores/registry.ts is the one authority on the store
 * vocabulary and the edges between stores. This script derives the document
 * from it so the two cannot drift: the previous hand-written version claimed 17
 * stores, named four that did not exist, and omitted eleven that did.
 *
 * Only the generated block is owned by this script. Anything below the
 * HAND-WRITTEN marker is left exactly as the author wrote it.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STORE_DEPENDENCIES,
  STORE_NAMES,
  getStoreInitializationOrder,
  getStoreDependents,
  getTransitiveDependencies,
  generateDependencyGraph,
  validateManifest,
  type StoreName,
} from '../src/stores/registry';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docPath = resolve(repoRoot, 'docs/STORE_DEPENDENCY_GRAPH.md');

const GENERATED_MARKER = '<!-- END GENERATED — everything below is hand-written -->';

function render(): string {
  const problems = validateManifest();
  if (problems.length > 0) {
    throw new Error(
      ['Refusing to generate a document over an invalid manifest:', ...problems.map((p) => `  - ${p}`)].join('\n')
    );
  }

  const order = getStoreInitializationOrder();
  const leaves = STORE_NAMES.filter((s) => STORE_DEPENDENCIES[s].length === 0);
  const dependent = STORE_NAMES.filter((s) => STORE_DEPENDENCIES[s].length > 0);

  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);

  push(
    '# Store Dependency Graph',
    '',
    '<!-- GENERATED FILE — do not edit the block above the marker.',
    '     Source: src/stores/registry.ts (STORE_DEPENDENCIES)',
    '     Regenerate: npm run docs:store-graph',
    '     Verify:     npm run docs:store-graph -- --check -->',
    '',
    `The GOAT application declares **${STORE_NAMES.length} stores** in`,
    '`src/stores/registry.ts`. That manifest is the single authority on store names',
    'and the edges between them; this document is derived from it, so the two cannot',
    'disagree. If a store is missing here, it is missing from the manifest — add it',
    'there, not here.',
    '',
    'Edges include **deferred** ones. A `require()` inside an action, or a call through',
    '`createLazyStoreAccessor`, is still a dependency — it has only moved from module-',
    'evaluation time to call time, where no static tool can see it.',
    '',
    '## Initialization order',
    '',
    "Derived by Kahn's algorithm from the manifest (`getStoreInitializationOrder()`).",
    'Every dependency appears before the store that declares it.',
    '',
    ...order.map((s, i) => `${i + 1}. \`${s}\``),
    '',
    `## Leaf stores (${leaves.length})`,
    '',
    'No store-to-store edges. Safe to construct first, and safe to touch in isolation.',
    '',
    ...leaves.map((s) => `- \`${s}\``),
    '',
    `## Dependent stores (${dependent.length})`,
    '',
    '| store | direct dependencies | transitive | depended on by |',
    '|---|---|---|---|',
  );

  for (const store of dependent) {
    const direct = [...STORE_DEPENDENCIES[store]].map((d) => `\`${d}\``).join(', ');
    const transitive = getTransitiveDependencies(store as StoreName);
    const dependents = getStoreDependents(store);
    push(
      `| \`${store}\` | ${direct} | ${transitive.length} | ${dependents.length ? dependents.map((d) => `\`${d}\``).join(', ') : '—'} |`
    );
  }

  push(
    '',
    '## Graph (DOT)',
    '',
    'Paste into Graphviz or any online DOT viewer.',
    '',
    '```dot',
    generateDependencyGraph(),
    '```',
    '',
    GENERATED_MARKER,
    ''
  );

  return lines.join('\n');
}

/**
 * Compare on normalized line endings. Git's autocrlf rewrites this file to CRLF
 * on checkout while the generator emits LF, so a byte comparison would report
 * "stale" on every run no matter the content — a check that can never go green
 * teaches people to ignore it.
 */
const lf = (s: string) => s.replace(/\r\n/g, '\n');

function readDoc(): string {
  return existsSync(docPath) ? lf(readFileSync(docPath, 'utf8')) : '';
}

function handWrittenTail(): string {
  const current = readDoc();
  const idx = current.indexOf(GENERATED_MARKER);
  if (idx === -1) return '';
  return current.slice(idx + GENERATED_MARKER.length).replace(/^\n+/, '\n');
}

const next = render() + handWrittenTail();
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  if (readDoc() !== next) {
    console.error(
      `docs/STORE_DEPENDENCY_GRAPH.md is stale relative to src/stores/registry.ts.\nRun: npm run docs:store-graph`
    );
    process.exit(1);
  }
  console.log(`docs/STORE_DEPENDENCY_GRAPH.md is current (${STORE_NAMES.length} declared stores).`);
} else {
  writeFileSync(docPath, next, 'utf8');
  console.log(`Wrote docs/STORE_DEPENDENCY_GRAPH.md from ${STORE_NAMES.length} declared stores.`);
}
