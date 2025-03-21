import eslintConfigTrumpet from "@trumpet/eslint-config-next";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
	...eslintConfigTrumpet,
	eslintConfigPrettier,
	{
		ignore: ["src/types/api-types.ts"], // this file is generated
		rules: {
			"no-console": "off",
		},
	},
];
