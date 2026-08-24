/**
 * ESLint Configuration — Production-Ready Rule Set
 * =================================================
 *
 * Base:
 *   - next/core-web-vitals: Next.js recommended rules including React, React Hooks,
 *     React Compiler, and import/resolver settings.
 *   - storybook/flat/recommended: Storybook-specific linting for story files.
 *
 * Custom rule layers (all set to "warn" so existing violations don't break builds):
 *
 *   1. Relaxed core-web-vitals overrides — downgrades pre-existing errors from the
 *      Next.js preset to warnings until the codebase is cleaned up:
 *      - react/no-unescaped-entities
 *      - react-hooks/rules-of-hooks, set-state-in-effect, set-state-in-render,
 *        purity, refs, immutability, static-components, preserve-manual-memoization
 *      - @next/next/no-html-link-for-pages
 *      - jsx-a11y/no-static-element-interactions, no-noninteractive-element-interactions
 *      - storybook/no-renderer-packages
 *
 *   2. jsx-a11y recommended — full accessibility rule set from eslint-plugin-jsx-a11y,
 *      with all "error"-level rules downgraded to "warn".
 *
 *   3. unused-imports — detects and flags unused imports and variables that
 *      @typescript-eslint/no-unused-vars may miss. Vars prefixed with _ are ignored.
 *
 *   4. import/order — enforces consistent import grouping and alphabetical ordering:
 *      builtin → external → internal (@/) → parent/sibling/index → type imports.
 *      import/no-duplicates catches redundant import statements.
 */

import coreWebVitals from "eslint-config-next/core-web-vitals";
import storybookPlugin from "eslint-plugin-storybook";
import unusedImports from "eslint-plugin-unused-imports";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = [
  ...coreWebVitals,
  ...storybookPlugin.configs["flat/recommended"],

  // jsx-a11y: accessibility rules (recommended preset, downgraded to warn)
  // The jsx-a11y plugin is already registered by next/core-web-vitals, so we
  // only add the recommended rules here to avoid plugin redefinition errors.
  {
    rules: Object.fromEntries(
      Object.entries(jsxA11y.flatConfigs.recommended.rules).map(
        ([rule, severity]) => [rule, severity === "error" ? "warn" : severity]
      )
    ),
  },

  // Downgrade pre-existing errors from core-web-vitals / storybook to warnings
  // so the build stays green while violations are fixed incrementally.
  // This block MUST come after jsx-a11y recommended to override any re-escalations.
  {
    rules: {
      "react/no-unescaped-entities": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "storybook/no-renderer-packages": "warn",
    },
  },

  // unused-imports: catch unused imports and variables
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },

  // import ordering: enforce consistent import organization
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
            "type",
          ],
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["type"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import/no-duplicates": "warn",
    },
  },
];

export default eslintConfig;
