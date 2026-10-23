/**
 * ESLint configuration for GOAT.
 *
 * Base is next/core-web-vitals (React, hooks, import resolver). On top of it:
 *   - jsx-a11y recommended, so accessibility findings show up in review;
 *   - unused-imports, with `_`-prefixed names ignored;
 *   - import/order and no-duplicates, so imports read the same everywhere.
 *
 * Correctness rules are errors; style and advisory rules are warnings. The
 * v1/v2 isolation rule and the per-rule ratchet were retired with v1
 * (docs/v2/TECHNICAL_PACKAGE.md §8).
 */

import coreWebVitals from "eslint-config-next/core-web-vitals";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = [
  ...coreWebVitals,

  // The jsx-a11y plugin is already registered by next/core-web-vitals, so only
  // its recommended rules are added, downgraded to warnings.
  {
    rules: Object.fromEntries(
      Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([rule, severity]) => [
        rule,
        severity === "error" ? "warn" : severity,
      ]),
    ),
  },

  {
    plugins: { "unused-imports": unusedImports },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" },
      ],
    },
  },

  {
    plugins: { import: importPlugin },
    rules: {
      "import/no-duplicates": "warn",
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"], "type"],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },

  {
    rules: {
      // These React Compiler rules are advisory here: the editor keeps refs and
      // store snapshots on purpose.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },

  { ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
];

export default eslintConfig;
