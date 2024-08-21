import eslintConfigBasemind from "@basemind/eslint-config-next";

export default [
	...eslintConfigBasemind,
	{
		files: ["**/*.tsx"],
		rules: {
			"@typescript-eslint/no-misused-promises": "off",
		},
		ignores: ["coverage", "gen"],
	},
];
