function IconGoAhead({ height = 15, width = 15, ...props }: React.HTMLProps<SVGSVGElement>) {
	return (
		<svg
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

export { IconGoAhead };
