import * as React from "react";

type SpacerOrientation = "horizontal" | "vertical";

interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
	orientation?: SpacerOrientation;
	size?: number | string;
}

export const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
	({ className = "", orientation = "horizontal", size, style = {}, ...props }, ref) => {
		const computedStyle = {
			...style,
			...(orientation === "horizontal" && !size && { flex: 1 }),
			...(size && {
				height: orientation === "horizontal" ? "1px" : size,
				width: orientation === "vertical" ? "1px" : size,
			}),
		};

		return <div ref={ref} {...props} className={className} style={computedStyle} />;
	},
);

Spacer.displayName = "Spacer";
