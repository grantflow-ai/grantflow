import eslintConfigTrumpet from "@trumpet/eslint-config-next";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
	{
		ignores: ["**/api-types.ts"], // this file is generated
	},
	...eslintConfigTrumpet,
	eslintConfigPrettier,
	{
		rules: {
			"no-console": "off",
		},
	},
];
