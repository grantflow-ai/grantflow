import eslintConfigBasemind from "@basemind/eslint-config-next";

export default [
	...eslintConfigBasemind,
	{
		rules: {
			"n/no-unsupported-features/node-builtins": "off",
		},
	},
	{
		files: ["**/*.tsx"],
		rules: {
			"@typescript-eslint/no-misused-promises": "off",
		},
		ignores: ["coverage", "gen"],
	},
];
