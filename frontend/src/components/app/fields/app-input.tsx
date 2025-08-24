import type { ComponentProps } from "react";
import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

export type AppInputProps = ComponentProps<typeof Input>;

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(({ className, ...props }, ref) => {
	const inputRef = ref;
	return <Input className={className} data-testid="app-input" ref={inputRef} {...props} />;
});

AppInput.displayName = "AppInput";
