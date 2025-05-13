"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function AppInput({
	className,
	errorMessage,
	icon,
	label,
	maxWords,
	showWordCount = false,
	testId,
	variant = "default",
	...props
}: {
	className?: string;
	errorMessage?: string;
	icon?: React.ReactNode;
	label?: string;
	maxWords?: number;
	showWordCount?: boolean;
	testId?: string;
	variant?: "default" | "field";
} & React.InputHTMLAttributes<HTMLInputElement>) {
	const hasError = typeof errorMessage === "string" && errorMessage.trim() !== "";
	const [text, setText] = useState("");

	const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
	const formattedWordCount = wordCount < 10 ? `0${wordCount}` : `${wordCount}`;
	const formattedMaxWords = maxWords ? (maxWords < 10 ? `0${maxWords}` : `${maxWords}`) : null;

	return (
		<div className="w-full" {...props}>
			<div className="flex justify-between items-center">
				{label && (
					<Label
						className={`block text-start text-sm font-light text-input-label ${hasError ? "text-error" : props.disabled ? "text-input-muted" : "text-input-label"}`}
						htmlFor={props.id ?? testId}
					>
						{label}
					</Label>
				)}

				{showWordCount && (
					<div
						className={`text-sm text-input-label ps-4" ${hasError ? "text-error" : props.disabled ? "text-input-muted" : "text-input-label"}`}
					>
						{formattedWordCount}
						{formattedMaxWords ? `/${formattedMaxWords}` : ""}
					</div>
				)}
			</div>

			<div className="relative">
				<Input
					className={cn(
						"w-full bg-white text-dark text-sm rounded-sm p-3 placeholder:text-sm",
						props.disabled ? "placeholder:text-input-muted" : "placeholder:text-input-placeholder",
						variant === "field" && "ring-1 ring-input-border",
						errorMessage && "border-error",
						icon && "pr-10",
						"focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-input",
						"focus-visible:border focus-visible:border-primary",
						className,
						{ ...props },
					)}
					data-testid={testId}
					disabled={props.disabled}
					id={props.id ?? testId}
					onChange={(e) => {
						setText(e.target.value);
					}}
					placeholder={props.placeholder}
					value={text}
				/>

				{icon && (
					<div
						className={cn(
							"absolute right-3 top-1/2 -translate-y-1/2",
							props.disabled && "text-input-muted pointer-events-none",
						)}
					>
						{icon}
					</div>
				)}
			</div>

			{hasError && (
				<div className="flex justify-start">
					<span className="text-sm text-error font-light" data-testid={`${testId}-error-message`}>
						{errorMessage}
					</span>
				</div>
			)}
		</div>
	);
}
