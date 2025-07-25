import type * as React from "react";
import { cn } from "@/utils";
import "@/components/ui/input/input.scss";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return <input type={type} className={cn("tiptap-input", className)} {...props} />;
}

function InputGroup({ className, children, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("tiptap-input-group", className)} {...props}>
			{children}
		</div>
	);
}

export { Input, InputGroup };
