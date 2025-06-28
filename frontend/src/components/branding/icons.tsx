function IconGoAhead({ height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			data-testid="icon-go-ahead"
			fill="currentColor"
			height={height}
			viewBox="0 -960 960 960"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
		</svg>
	);
}

function IconGoBack({ height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
			data-testid="icon-go-back"
			fill="currentColor"
			height={height}
			viewBox="0 0 16 16"
			width={width}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<mask
				height="16"
				id="mask0_1175_4938"
				maskUnits="userSpaceOnUse"
				style={{ maskType: "alpha" }}
				width="16"
				x="0"
				y="0"
			>
				<rect fill="currentColor" height="16" width="16" />
			</mask>
			<g mask="url(#mask0_1175_4938)">
				<path
					d="M9.33334 12L5.33334 8L9.33334 4L10.2667 4.93333L7.20001 8L10.2667 11.0667L9.33334 12Z"
					fill="currentColor"
				/>
			</g>
		</svg>
	);
}

export { IconGoAhead, IconGoBack };