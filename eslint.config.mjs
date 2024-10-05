import eslintConfigTrumpet from "@trumpet/eslint-config-next";

export default [
	...eslintConfigTrumpet,
	{
		rules: {
			"unicorn/no-nested-ternary": "off",
			"unicorn/no-useless-promise-resolve-reject": "off",
		},
	},
];
