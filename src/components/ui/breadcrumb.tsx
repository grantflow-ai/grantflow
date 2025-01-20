import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { utils } from "@/lib/utils";

const Breadcrumb = React.forwardRef<
	HTMLElement,
	{
		separator?: React.ReactNode;
	} & React.ComponentPropsWithoutRef<"nav">
>(({ ...props }, ref) => <nav aria-label="breadcrumb" ref={ref} {...props} />);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<"ol">>(
	({ className, ...props }, ref) => (
		<ol
			className={utils(
				"flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
				className,
			)}
			ref={ref}
			{...props}
		/>
	),
);
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
	({ className, ...props }, ref) => (
		<li className={utils("inline-flex items-center gap-1.5", className)} ref={ref} {...props} />
	),
);
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<
	HTMLAnchorElement,
	{
		asChild?: boolean;
	} & React.ComponentPropsWithoutRef<"a">
>(({ asChild, className, ...props }, ref) => {
	const Comp = asChild ? Slot : "a";

	return <Comp className={utils("transition-colors hover:text-foreground", className)} ref={ref} {...props} />;
});
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
	({ className, ...props }, ref) => (
		<span
			aria-current="page"
			aria-disabled="true"
			className={utils("font-normal text-foreground", className)}
			ref={ref}
			role="link"
			{...props}
		/>
	),
);
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = ({ children, className, ...props }: React.ComponentProps<"li">) => (
	<li aria-hidden="true" className={utils("[&>svg]:w-3.5 [&>svg]:h-3.5", className)} role="presentation" {...props}>
		{children ?? <ChevronRight />}
	</li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
	<span
		aria-hidden="true"
		className={utils("flex h-9 w-9 items-center justify-center", className)}
		role="presentation"
		{...props}
	>
		<MoreHorizontal className="h-4 w-4" />
		<span className="sr-only">More</span>
	</span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis";

export {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
};
