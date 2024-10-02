import eslintConfigTrumpet from "@trumpet/eslint-config-next";

export default [
	...eslintConfigTrumpet,
	{
		rules: {
			"n/no-unsupported-features/node-builtins": "off",
			"unicorn/no-nested-ternary": "off",
		},
	},
];
