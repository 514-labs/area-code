import baseConfig from "@repo/eslint-config";

export default [
  ...baseConfig,
  {
    files: ["**/*.{js,ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
