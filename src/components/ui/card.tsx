import * as React from "react";

import { utils } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
	<div
		className={utils("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
		ref={ref}
		{...props}
	/>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div className={utils("flex flex-col space-y-1.5 p-6", className)} ref={ref} {...props} />
	),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
	({ className, ...props }, ref) => (
		// eslint-disable-next-line jsx-a11y/heading-has-content
		<h3 className={utils("text-2xl font-semibold leading-none tracking-tight", className)} ref={ref} {...props} />
	),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
	({ className, ...props }, ref) => (
		<p className={utils("text-sm text-muted-foreground", className)} ref={ref} {...props} />
	),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => <div className={utils("p-6 pt-0", className)} ref={ref} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div className={utils("flex items-center p-6 pt-0", className)} ref={ref} {...props} />
	),
);
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
