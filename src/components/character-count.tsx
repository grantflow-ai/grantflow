import React from "react";
import { cn } from "@/lib/utils";

interface CharacterCountProps {
	className?: string;
	maxLength: number;
	minLength: number;
	value: string;
}

export function CharacterCount({ className, maxLength, minLength, value }: CharacterCountProps) {
	if (value.length === 0 || (value.length >= minLength && value.length <= maxLength)) {
		return null;
	}

	return (
		<p
			className={cn(
				"text-xs transition-colors duration-200",
				value.length < minLength && "text-destructive",
				value.length > maxLength && "text-destructive",
				className,
			)}
		>
			{value.length} characters
			{value.length < minLength && ` (${minLength - value.length} more required)`}
			{value.length > maxLength && ` (${value.length - maxLength} over limit)`}
		</p>
	);
}
