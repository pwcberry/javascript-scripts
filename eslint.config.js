import globals from "globals";
import pluginJs from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import mochaPlugin from "eslint-plugin-mocha";

export default [
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    prettierConfig,
    mochaPlugin.configs.recommended,
    {
        rules: {
            "mocha/no-mocha-arrows": "off",
            "no-unused-vars": "warn",
        },
    },
];
