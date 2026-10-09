import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

/**
 * Proves the v1 <-> v2 isolation rule in eslint.config.mjs can fail in both
 * directions, and stays quiet for the imports it allows. The probes are linted
 * as text under made-up paths; nothing is written to disk.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const eslint = new ESLint({ cwd: repoRoot });

async function restrictedImports(filePath: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath: path.join(repoRoot, filePath) });
  return result.messages.filter((m) => m.ruleId === 'no-restricted-imports').length;
}

describe('v1 <-> v2 isolation rule', () => {
  it('refuses a v1 import from v2 domain code', async () => {
    expect(await restrictedImports('src/v2/__probe__.ts', "import { x } from '@/lib/x';\nexport const y = x;\n")).toBe(1);
  }, 60_000);

  it('refuses a v1 import from a v2 route', async () => {
    expect(
      await restrictedImports('src/app/v2/__probe__.tsx', "import { x } from '@/stores/x';\nexport const y = x;\n"),
    ).toBe(1);
  }, 60_000);

  it('refuses a v2 import from v1 code', async () => {
    expect(await restrictedImports('src/lib/__probe__.ts', "import { x } from '@/v2/x';\nexport const y = x;\n")).toBe(1);
  }, 60_000);

  it('allows v2 importing v2 and packages', async () => {
    expect(
      await restrictedImports(
        'src/v2/__probe__.ts',
        "import { z } from 'zod';\nimport { x } from '@/v2/x';\nexport const y = [x, z];\n",
      ),
    ).toBe(0);
  }, 60_000);
});
