export function BrandPattern({
	strokeWidth = "0.3",
	...props
}: { strokeWidth?: string } & React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			fill="none"
			height="491"
			preserveAspectRatio="none"
			viewBox="0 0 846 491"
			width="846"
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M847 1L670 126L609 73L551 126M847 1L753 168L551 126M847 1V501H1L289 393M847 1L665 21L551 126M388.5 137.5L566 327M388.5 137.5L243 301M388.5 137.5L551 126M566 327L551 126M566 327L566.956 330.772M551 126L763 363L805 340L847 317L718 501L464 418L282 501L289 393M289 393L362 352L584 398L566.956 330.772M289 393L243 301M566.956 330.772L243 301"
				stroke="url(#paint0_linear_48_19)"
				strokeWidth={strokeWidth}
			/>
			<defs>
				<linearGradient
					gradientUnits="userSpaceOnUse"
					id="paint0_linear_48_19"
					x1="323"
					x2="842"
					y1="117"
					y2="507"
				>
					<stop stopColor="white" />
					<stop offset="1" stopColor="#1E13F8" />
				</linearGradient>
			</defs>
		</svg>
	);
}
