import globals from "globals";
import pluginJs from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import mochaPlugin from "eslint-plugin-mocha";

export default [
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    prettierConfig,
    mochaPlugin.configs.flat.recommended,
    {
        rules: {
            "mocha/no-mocha-arrows": "off",
        },
    },
];
