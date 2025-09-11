import * as React from "react";

export const FontSizeIcon = React.memo((_: React.SVGProps<SVGSVGElement>) => {
	return (
		<svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<title>Font Size</title>
			<mask id="mask0_5111_4511" maskUnits="userSpaceOnUse" x="0" y="0" width="17" height="16">
				<rect x="0.5" width="16" height="16" fill="#D9D9D9" />
			</mask>
			<g mask="url(#mask0_5111_4511)">
				<path
					d="M9.83203 13.3334V4.66675H6.4987V2.66675H15.1654V4.66675H11.832V13.3334H9.83203ZM3.83203 13.3334V8.00008H1.83203V6.00008H7.83203V8.00008H5.83203V13.3334H3.83203Z"
					fill="#4A4855"
				/>
			</g>
		</svg>
	);
});

FontSizeIcon.displayName = "FontSizeIcon";
