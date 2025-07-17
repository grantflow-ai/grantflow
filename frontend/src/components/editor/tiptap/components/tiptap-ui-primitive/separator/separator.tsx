import * as React from "react";
import "@/components/editor/tiptap/components/tiptap-ui-primitive/separator/separator.css";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
	decorative?: boolean;
	orientation?: Orientation;
}

type Orientation = "horizontal" | "vertical";

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
	({ className = "", decorative, orientation = "vertical", ...divProps }, ref) => {
		const ariaOrientation = orientation === "vertical" ? orientation : undefined;
		const semanticProps = decorative
			? { role: "none" }
			: { "aria-orientation": ariaOrientation, role: "separator" };

		return (
			<div
				className={`tiptap-separator ${className}`.trim()}
				data-orientation={orientation}
				{...semanticProps}
				{...divProps}
				ref={ref}
			/>
		);
	},
);

Separator.displayName = "Separator";
