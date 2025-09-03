"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return <TabsPrimitive.Root className={cn("flex flex-col gap-2", className)} data-slot="tabs" {...props} />;
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content className={cn("flex-1 outline-none", className)} data-slot="tabs-content" {...props} />
	);
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			className={cn(
				"bg-white text-app-black inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
				className,
			)}
			data-slot="tabs-list"
			{...props}
		/>
	);
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			className={cn(
				"text-gray-400 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2.5 rounded-lg border border-transparent px-6 py-1 text-base font-normal font-button whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-1 focus-visible:outline-ring [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			data-slot="tabs-trigger"
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
