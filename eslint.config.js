import globals from "globals";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";
import mochaPlugin from "eslint-plugin-mocha";

export default defineConfig([
  {
    files: ["lib/**/*.js", "test/**/*.test.js", "test/*.js", "eslint.config.js"],
    extends: [
      js.configs.recommended,
      mochaPlugin.configs.recommended,
      stylistic.configs.customize({
        indent: 2,
        quotes: "double",
        semi: true,
        jsx: true,
      }),
    ],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "mocha/no-mocha-arrows": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]);
