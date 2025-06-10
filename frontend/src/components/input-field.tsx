"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function AppInput({
	className,
	countType = "chars",
	errorMessage,
	icon,
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
	icon?: React.ReactNode;
	label?: string;
	maxCount?: number;
	showCount?: boolean;
	testId?: string;
	variant?: "default" | "field";
} & React.InputHTMLAttributes<HTMLInputElement>) {
	const hasError = !!errorMessage;
	const [text, setText] = useState(props.value?.toString() ?? "");

	const displayText = props.value === undefined ? text : props.value.toString();

	const currentCount =
		countType === "chars"
			? displayText.length
			: displayText.trim() === ""
				? 0
				: displayText.trim().split(/\s+/).length;

	const formattedCount = currentCount < 10 ? `0${currentCount}` : `${currentCount}`;
	const formattedMaxCount = maxCount ? (maxCount < 10 ? `0${maxCount}` : `${maxCount}`) : null;

	return (
		<div className="w-full">
			<div className="flex items-center justify-between">
				{label && (
					<Label
						className={`block text-start text-xs font-light ${hasError ? "text-error" : props.disabled ? "text-input-muted" : "text-input-label"}`}
						data-testid={`${testId}-label`}
						htmlFor={props.id ?? testId}
					>
						{label}
					</Label>
				)}

				{showCount && (
					<div
						className={`ps-4 text-xs ${hasError ? "text-error" : props.disabled ? "text-input-muted" : "text-input-label"}`}
						data-testid={`${testId}-${countType}-count`}
					>
						{formattedCount}
						{formattedMaxCount ? `/${formattedMaxCount}` : ""}
					</div>
				)}
			</div>

			<div className="relative">
				<Input
					{...props}
					className={cn(
						"w-full bg-white text-dark text-sm rounded-sm p-3 placeholder:text-sm",
						props.disabled ? "placeholder:text-input-muted" : "placeholder:text-input-placeholder",
						variant === "field" && "ring-1 ring-input-border",
						errorMessage && "border-error",
						icon && "pr-10",
						"focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input",
						"focus-visible:border focus-visible:border-primary",
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

				{icon && (
					<div
						className={cn(
							"absolute right-3 top-1/2 -translate-y-1/2",
							props.disabled && "text-input-muted pointer-events-none",
						)}
						data-testid={`${testId}-icon`}
					>
						{icon}
					</div>
				)}
			</div>

			<div
				className={`text-error mb-1 text-start text-sm ${hasError ? "visible" : "invisible"}`}
				data-testid={`${testId}-error`}
			>
				{errorMessage}
			</div>
		</div>
	);
}
