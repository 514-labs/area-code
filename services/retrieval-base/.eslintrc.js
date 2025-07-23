module.exports = {
  extends: ["@repo/eslint-config"],
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
