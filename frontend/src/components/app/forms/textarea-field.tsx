"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const getTextColorClass = (hasError: boolean, disabled?: boolean) => {
	if (hasError) return "text-error";
	if (disabled) return "text-input-muted";
	return "text-input-label";
};

const calculateCount = (text: string, countType: "chars" | "words") => {
	if (countType === "chars") {
		return text.length;
	}
	return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
};

const formatCount = (count: number) => {
	return count < 10 ? `0${count}` : `${count}`;
};

export default function AppTextArea({
	className,
	countType = "chars",
	errorMessage,
	label,
	maxCount,
	showCount = false,
	testId = "test-textarea",
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
	const currentCount = calculateCount(displayText, countType);
	const formattedCount = formatCount(currentCount);
	const formattedMaxCount = maxCount ? formatCount(maxCount) : null;
	const textColorClass = getTextColorClass(hasError, props.disabled);

	return (
		<div className="w-full">
			<div className="flex items-center justify-between">
				{label && (
					<Label
						className={`block text-start text-xs font-light ${textColorClass}`}
						data-testid={`${testId}-label`}
						htmlFor={props.id ?? testId}
					>
						{label}
					</Label>
				)}

				{showCount && (
					<div className={`ps-4 text-xs ${textColorClass}`} data-testid={`${testId}-${countType}-count`}>
						{formattedCount}
						{formattedMaxCount ? `/${formattedMaxCount}` : ""}
					</div>
				)}
			</div>

			<Textarea
				{...props}
				className={cn(
					"w-full bg-white text-dark text-sm rounded-sm py-2 px-3 placeholder:text-sm",
					props.disabled ? "placeholder:text-input-muted" : "placeholder:text-input-placeholder",
					variant === "field" && "ring-1 ring-input-border",
					errorMessage && "border-error",
					"focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input",
					"focus-visible:border focus-visible:border-primary",
					className,
				)}
				data-testid={testId}
				disabled={props.disabled}
				id={props.id ?? testId}
				maxLength={countType === "chars" ? maxCount : undefined}
				onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
					setText(e.target.value);
					props.onChange?.(e);
				}}
				placeholder={props.placeholder}
				value={displayText}
			/>

			<div
				className={`text-error mb-1 text-start text-sm ${hasError ? "visible" : "invisible"}`}
				data-testid={`${testId}-error`}
			>
				{errorMessage}
			</div>
		</div>
	);
}