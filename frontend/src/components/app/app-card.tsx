"use client";

import type * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AppCardActionProps = React.ComponentProps<"div">;

type AppCardContentProps = React.ComponentProps<typeof CardContent>;

type AppCardDescriptionProps = React.ComponentProps<typeof CardDescription>;

type AppCardFooterProps = React.ComponentProps<typeof CardFooter>;

type AppCardHeaderProps = React.ComponentProps<typeof CardHeader>;

type AppCardProps = React.ComponentProps<typeof Card>;

type AppCardTitleProps = React.ComponentProps<typeof CardTitle>;

interface InfoCardProps {
	action?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	description?: string;
	footer?: React.ReactNode;
	title: string;
}

export function AppCard({ ...props }: AppCardProps) {
	return <Card data-testid="app-card" {...props} />;
}

export function AppCardAction({ className, ...props }: AppCardActionProps) {
	return (
		<div
			className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
			data-slot="card-action"
			data-testid="app-card-action"
			{...props}
		/>
	);
}

export function AppCardContent({ ...props }: AppCardContentProps) {
	return <CardContent data-testid="app-card-content" {...props} />;
}

export function AppCardDescription({ ...props }: AppCardDescriptionProps) {
	return <CardDescription data-testid="app-card-description" {...props} />;
}

export function AppCardFooter({ ...props }: AppCardFooterProps) {
	return <CardFooter data-testid="app-card-footer" {...props} />;
}

export function AppCardHeader({ className, ...props }: AppCardHeaderProps) {
	return (
		<CardHeader
			className={cn(
				"@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
				className,
			)}
			data-testid="app-card-header"
			{...props}
		/>
	);
}



export function AppCardTitle({ ...props }: AppCardTitleProps) {
	return <CardTitle data-testid="app-card-title" {...props} />;
}

export function InfoCard({ action, children, className, description, footer, title }: InfoCardProps) {
	return (
		<AppCard className={className} data-testid="info-card">
			<AppCardHeader>
				<AppCardTitle>{title}</AppCardTitle>
				{description && <AppCardDescription>{description}</AppCardDescription>}
				{action && <AppCardAction>{action}</AppCardAction>}
			</AppCardHeader>
			{children && <AppCardContent>{children}</AppCardContent>}
			{footer && <AppCardFooter>{footer}</AppCardFooter>}
		</AppCard>
	);
}
