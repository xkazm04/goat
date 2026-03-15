import coreWebVitals from "eslint-config-next/core-web-vitals";
import storybookPlugin from "eslint-plugin-storybook";

const eslintConfig = [
  ...coreWebVitals,
  ...storybookPlugin.configs["flat/recommended"],
];

export default eslintConfig;
