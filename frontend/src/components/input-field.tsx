"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AppInput({
	className,
	error,
	fullWidth = false,
	icon,
	iconPosition = "right",
	label,
	maxWords,
	onChange,
	showWordCount = false,
	testId,
	value,
	...props
}: {
	className?: string;
	error?: boolean;
	fullWidth?: boolean;
	icon?: React.ReactNode;
	iconPosition?: "left" | "right";
	label?: string;
	maxWords?: number;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	showWordCount?: boolean;
	testId?: string;
	value?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
	const [wordCount, setWordCount] = useState(0);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (showWordCount) {
			const words = e.target.value.trim().split(/\s+/);
			const count = e.target.value.trim() === "" ? 0 : words.length;
			setWordCount(count);
		}

		if (onChange) {
			onChange(e);
		}
	};

	React.useEffect(() => {
		if (showWordCount && typeof value === "string") {
			const words = value.trim().split(/\s+/);
			const count = value.trim() === "" ? 0 : words.length;
			setWordCount(count);
		}
	}, [value, showWordCount]);

	return (
		<div className="w-full">
			{label && (
				<label className="block text-start text-sm font-medium text-gray-700 mb-1" htmlFor={props.id ?? testId}>
					{label}
				</label>
			)}

			<div className="relative">
				{icon && iconPosition === "left" && (
					<div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>
				)}

				<Input
					className={cn(
						"bg-white text-gray-600 rounded-sm p-3",
						"md:placeholder:font-light placeholder:text-lg md:placeholder:text-[1.05rem]",
						"placeholder:text-slate-500/70 md:placeholder:text-slate-500",
						fullWidth ? "w-full" : "md:w-[17rem]",
						error && "border-error focus-visible:ring-error",
						icon && iconPosition === "left" && "pl-10",
						icon && iconPosition === "right" && "pr-10",
						className,
					)}
					data-testid={testId}
					id={props.id ?? testId}
					onChange={handleChange}
					value={value}
					{...props}
				/>

				{icon && iconPosition === "right" && (
					<div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</div>
				)}
			</div>

			{showWordCount && (
				<div className="text-xs text-gray-500 text-right mt-1">
					{wordCount}
					{maxWords ? ` / ${maxWords}` : ""} words
				</div>
			)}
		</div>
	);
}
