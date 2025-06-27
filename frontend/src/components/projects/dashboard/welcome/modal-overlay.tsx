"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const WelcomeModalOverlay = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		className={cn("fixed inset-0 z-50 bg-popup/40 animate-in fade-in-0", className)}
		ref={ref}
		{...props}
	/>
));
WelcomeModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface WelcomeModalContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
	showCloseButton?: boolean;
}

const WelcomeModalContent = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Content>,
	WelcomeModalContentProps
>(({ children, className, showCloseButton = false, ...props }, ref) => (
	<DialogPrimitive.Portal>
		<WelcomeModalOverlay />
		<DialogPrimitive.Content
			className={cn(
				"fixed left-[50%] top-[50%] z-50 grid w-full max-w-[954px] translate-x-[-50%] translate-y-[-50%] gap-0 border-0 bg-white p-0 shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-left-1/2 slide-in-from-top-[48%] sm:rounded-lg",
				className,
			)}
			ref={ref}
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none">
					<X className="size-4" />
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			)}
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
));
WelcomeModalContent.displayName = DialogPrimitive.Content.displayName;

export { WelcomeModalContent, WelcomeModalOverlay };
