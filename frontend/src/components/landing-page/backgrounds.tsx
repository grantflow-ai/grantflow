import { cn } from "@/lib/utils";

const MAP_GRADIENT_CENTER = {
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
	position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
} & React.HTMLAttributes<HTMLDivElement>) {
	const { centerX, centerY } = MAP_GRADIENT_CENTER[position];

	return (
		<div
			className={cn("opacity-70", className)}
			style={{
				background: `radial-gradient(60% 100% at ${centerX} ${centerY}, var(--primary) 0%, transparent 100%)`,
			}}
			{...rest}
		/>
	);
}

export { GradientBackground };
