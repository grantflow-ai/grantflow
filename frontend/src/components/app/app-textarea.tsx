import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";

export type AppTextareaProps = ComponentProps<typeof Textarea>;

export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(({ className, ...props }, ref) => {
	return <Textarea className={className} data-testid="app-textarea" ref={ref} {...props} />;
});

AppTextarea.displayName = "AppTextarea";