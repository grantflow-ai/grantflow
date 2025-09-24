import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

export type AppInputProps = ComponentProps<typeof Input>;

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(({ className, ...props }, ref) => {
	return <Input className={className} data-testid="app-input" ref={ref} {...props} />;
});

AppInput.displayName = "AppInput";
