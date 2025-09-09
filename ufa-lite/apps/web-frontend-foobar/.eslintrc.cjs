/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: ["eslint:recommended", "@typescript-eslint/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-non-null-assertion": "off",
  },
};
