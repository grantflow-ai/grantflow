import * as React from "react";

export const FontFamilyIcon = React.memo(({ ...props }: React.SVGProps<SVGSVGElement>) => {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 20 20"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<title>Font Family</title>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M4 6h16v2H4V6zm2 4h12v2H6v-2zm2 4h8v2H8v-2z"
				fill="currentColor"
			/>
		</svg>
	);
});

FontFamilyIcon.displayName = "FontFamilyIcon";
