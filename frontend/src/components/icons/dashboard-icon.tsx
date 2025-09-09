import type { SVGProps } from "react";

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg fill="none" height="16" viewBox="0 0 18 18" width="16" xmlns="http://www.w3.org/2000/svg" {...props}>
			<title>Dashboard Icon</title>
			<path
				d="M0 0H8V8H0V0ZM10 0H18V8H10V0ZM0 10H8V18H0V10ZM13 10H15V13H18V15H15V18H13V15H10V13H13V10ZM12 2V6H16V2H12ZM2 2V6H6V2H2ZM2 12V16H6V12H2Z"
				fill="currentColor"
			/>
		</svg>
	);
}
