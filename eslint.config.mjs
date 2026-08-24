/**
 * ESLint Configuration — Production-Ready Rule Set
 * =================================================
 *
 * Base:
 *   - next/core-web-vitals: Next.js recommended rules including React, React Hooks,
 *     React Compiler, and import/resolver settings.
 *   - storybook/flat/recommended: Storybook-specific linting for story files.
 *
 * SEVERITY POLICY (2026-08-24, registry quality-gates/severity-by-construction)
 * -----------------------------------------------------------------------------
 * Until 2026-08-24 EVERY rule here was "warn", including react-hooks/rules-of-hooks.
 * `npm run lint` therefore had no input that could make it exit non-zero: it was
 * advice wearing a gate's name. There are now two tiers, and the difference is
 * which product you are buying:
 *
 *   ERROR  — correctness rules whose violation count is 0 today. Promoting a
 *            zero-population rule costs nothing now and refuses the first
 *            regression. See the `correctness` block below; each rule in it was
 *            measured at 0 before being listed, and the list is re-measurable
 *            with `npm run lint`.
 *
 *   WARN   — everything with a legacy population (721 findings across 22 rules
 *            as of 2026-08-24). These are held by a RATCHET, not by severity:
 *            `npm run lint:ratchet` compares the per-rule counts against
 *            .ai/ratchet-baseline.json and fails on any mismatch in EITHER
 *            direction. A rise is a regression; an unexplained drop is a
 *            possibly-broken instrument. When a bucket reaches 0 its rule
 *            graduates into the `correctness` block and its baseline entry is
 *            deleted (registry quality-gates/ratchet-design, "graduation").
 *
 * `no-undef` is deliberately NOT promoted: it reports 204 findings here, all of
 * them TypeScript globals and DOM lib types it cannot see. The no-undef-class
 * authority for this repo is `npm run typecheck`, whose error count is a ratchet
 * bucket of its own (29 at baseline).
 *
 * Custom rule layers:
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
      "import/no-duplicates": "error",
    },
  },

  // ===========================================================================
  // correctness — BLOCKING. Every rule below was measured at 0 findings over
  // `src/` on 2026-08-24 before being promoted, so the promotion cannot break a
  // build today and refuses the first violation tomorrow. This is the whole
  // reason `npm run lint` now has an input that makes it exit non-zero.
  //
  // Adding a rule here requires measuring it at 0 first:
  //   npx eslint src -f json --rule '{"<rule>":"warn"}'
  // A rule with a legacy population belongs in the ratchet, not here.
  // ===========================================================================
  {
    rules: {
      // Hook order — unconditional correctness. Was "warn" with 13 real
      // violations across 3 files (PhysicsDragOverlay, SavedListsSection,
      // LayoutManager); those were fixed in the same change that promoted it.
      "react-hooks/rules-of-hooks": "error",

      // Unused imports: mechanical, auto-fixable, and 0 after `--fix`.
      // (no-unused-VARS stays a warn/ratchet bucket at 230 — a different job.)
      "unused-imports/no-unused-imports": "error",

      // no-undef class, JSX half. Plain `no-undef` is unusable on TypeScript
      // (204 false positives here); `tsc --noEmit` is the authority instead.
      "react/jsx-no-undef": "error",
      "react/jsx-key": "error",

      // eslint:recommended's correctness core. next/core-web-vitals does not
      // pull `js.configs.recommended`, so none of these were running at all —
      // they were not "warn", they were absent.
      "for-direction": "error",
      "getter-return": "error",
      "no-async-promise-executor": "error",
      "no-class-assign": "error",
      "no-compare-neg-zero": "error",
      "no-cond-assign": "error",
      "no-const-assign": "error",
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-dupe-else-if": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-empty-pattern": "error",
      "no-ex-assign": "error",
      "no-fallthrough": "error",
      "no-func-assign": "error",
      "no-import-assign": "error",
      "no-invalid-regexp": "error",
      "no-irregular-whitespace": "error",
      "no-loss-of-precision": "error",
      "no-misleading-character-class": "error",
      "no-new-native-nonconstructor": "error",
      "no-obj-calls": "error",
      "no-prototype-builtins": "error",
      "no-regex-spaces": "error",
      "no-self-assign": "error",
      "no-setter-return": "error",
      "no-shadow-restricted-names": "error",
      "no-sparse-arrays": "error",
      "no-this-before-super": "error",
      "no-unexpected-multiline": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "no-useless-backreference": "error",
      "require-yield": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
    },
  },
];

export default eslintConfig;
