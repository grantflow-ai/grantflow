const MAP_GRADIENT_CENTER = {
	"bottom-center": { centerX: "50%", centerY: "100%" },
	"bottom-left": { centerX: "0%", centerY: "80%" },
	"bottom-right": { centerX: "100%", centerY: "80%" },
	"top-left": { centerX: "0%", centerY: "0%" },
	"top-right": { centerX: "100%", centerY: "0%" },
};

function GradientBackground({
	className,
	position = "bottom-right",
	...rest
}: {
	position?: keyof typeof MAP_GRADIENT_CENTER;
} & React.HTMLAttributes<HTMLDivElement>) {
	const { centerX, centerY } = MAP_GRADIENT_CENTER[position];

	if (position === "bottom-center") {
		return (
			<div
				className={className}
				style={{ background: "radial-gradient(100% 60% at 50% 100%, var(--primary) -70%, transparent 100%)" }}
				{...rest}
			/>
		);
	}
	return (
		<div
			className={className}
			style={{
				background: `radial-gradient(50% 100% at ${centerX} ${centerY}, var(--primary) 0%, transparent 100%)`,
			}}
			{...rest}
		/>
	);
}

export { GradientBackground };
