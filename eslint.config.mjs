import eslintConfigTrumpet from "@trumpet/eslint-config-next";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
	...eslintConfigTrumpet,
	eslintConfigPrettier,
	{
		rules: {
			"no-console": "off",
		},
	},
];
