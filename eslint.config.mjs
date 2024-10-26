import eslintConfigTrumpet from "@trumpet/eslint-config-next";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
	...eslintConfigTrumpet,
	{
		rules: {
			"unicorn/no-nested-ternary": "off",
			"unicorn/no-useless-promise-resolve-reject": "off",
			"@typescript-eslint/ no-non-null-assertion": "off",
		},
	},
	eslintConfigPrettier,
	{
		ignores: ["next.config.mjs"],
	},
];
