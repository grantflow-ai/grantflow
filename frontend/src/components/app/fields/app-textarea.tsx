import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";

type AppTextareaProps = ComponentProps<typeof Textarea>;

export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(({ className, ...props }, ref) => {
	const textareaRef = ref;
	return (
		<Textarea
			className={`focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border focus-visible:border-primary ${className}`}
			data-testid="app-textarea"
			ref={textareaRef}
			{...props}
		/>
	);
});

AppTextarea.displayName = "AppTextarea";
