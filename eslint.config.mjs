import coreWebVitals from "eslint-config-next/core-web-vitals";
import storybookPlugin from "eslint-plugin-storybook";
import unusedImports from "eslint-plugin-unused-imports";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = [
  ...coreWebVitals,
  ...storybookPlugin.configs["flat/recommended"],

  // jsx-a11y: accessibility rules (recommended preset rules, downgraded to warn)
  // The jsx-a11y plugin is already registered by next/core-web-vitals, so we
  // only add the recommended rules here to avoid plugin redefinition errors.
  // Existing violations: expect warnings for missing alt text, click handlers
  // without keyboard equivalents, and missing form labels across components.
  {
    rules: Object.fromEntries(
      Object.entries(jsxA11y.flatConfigs.recommended.rules).map(
        ([rule, severity]) => [rule, severity === "error" ? "warn" : severity]
      )
    ),
  },

  // unused-imports: catch unused imports and variables
  // Existing violations: multiple files have unused imports that should be
  // cleaned up (e.g., unused type imports, removed component references).
  // Also catches unused variables that @typescript-eslint/no-unused-vars misses.
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
  // Existing violations: imports are not consistently ordered across the
  // codebase — React/Next imports, third-party, internal (@/) aliases,
  // and relative imports are often intermixed.
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
