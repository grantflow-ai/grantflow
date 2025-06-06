"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function AppTextarea({
	className,
	countType = "chars",
	errorMessage,
	label,
	maxCount,
	showCount = false,
	testId,
	variant = "default",
	...props
}: {
	className?: string;
	countType?: "chars" | "words";
	errorMessage?: null | React.ReactNode | string;
	label?: string;
	maxCount?: number;
	showCount?: boolean;
	testId?: string;
	variant?: "default" | "field";
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
	const hasError = !!errorMessage;
	const [text, setText] = useState(props.value?.toString() ?? "");

	const displayText = props.value === undefined ? text : props.value.toString();

	const currentCount =
		countType === "chars"
			? displayText.length
			: displayText.trim() === ""
				? 0
				: displayText.trim().split(/\s+/).length;

	const formattedCount = currentCount.toString();
	const formattedMaxCount = maxCount?.toString() ?? null;

	return (
		<div className="w-full">
			<div className="flex items-center justify-between">
				{label && (
					<Label
						className={`block text-start text-sm font-normal ${hasError ? "text-error" : props.disabled ? "text-input-muted" : "text-foreground"}`}
						data-testid={`${testId}-label`}
						htmlFor={props.id ?? testId}
					>
						{label}
					</Label>
				)}

				{showCount && (
					<div
						className={`text-sm ${hasError ? "text-error" : props.disabled ? "text-input-muted" : "text-muted-foreground"}`}
						data-testid={`${testId}-${countType}-count`}
					>
						{formattedCount}
						{formattedMaxCount ? `/${formattedMaxCount}` : ""}
					</div>
				)}
			</div>

			<Textarea
				{...props}
				className={cn(
					"mt-2 min-h-[80px] resize-none",
					variant === "field" && "ring-1 ring-input-border",
					errorMessage && "border-error",
					className,
				)}
				data-testid={testId}
				disabled={props.disabled}
				id={props.id ?? testId}
				maxLength={countType === "chars" ? maxCount : undefined}
				onChange={(e) => {
					setText(e.target.value);
					props.onChange?.(e);
				}}
				placeholder={props.placeholder}
				value={displayText}
			/>

			{errorMessage && (
				<div className="text-error mt-1 text-start text-sm" data-testid={`${testId}-error`}>
					{errorMessage}
				</div>
			)}
		</div>
	);
}
