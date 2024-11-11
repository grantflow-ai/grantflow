import eslintConfigTrumpet from "@trumpet/eslint-config-next";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
	...eslintConfigTrumpet,
	{
		rules: {
			"@typescript-eslint/ no-non-null-assertion": "off",
			"no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
			"unicorn/no-nested-ternary": "off",
			"unicorn/no-useless-promise-resolve-reject": "off",
		},
	},
	eslintConfigPrettier,
	{
		ignores: ["next.config.mjs"],
	},
];
