"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MultiSelectProps {
	"data-testid"?: string;
	onValueChange: (value: string[]) => void;
	options: string[];
	placeholder: string;
	value: string[];
}

export function MultiSelect({ "data-testid": testId, onValueChange, options, placeholder, value }: MultiSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleOptionToggle = (option: string) => {
		const newValue = value.includes(option) ? value.filter((v) => v !== option) : [...value, option];
		onValueChange(newValue);
	};

	const displayText = value.length > 0 ? `${value.length} selected` : placeholder;

	return (
		<div className="relative w-full" data-testid={testId} ref={containerRef}>
			<button
				className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
					isOpen ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-300"
				} bg-white hover:border-gray-400`}
				data-testid={testId ? `${testId}-trigger` : undefined}
				onClick={() => {
					setIsOpen(!isOpen);
				}}
				type="button"
			>
				<span
					className={value.length > 0 ? "text-gray-900" : "text-gray-500"}
					data-testid={testId ? `${testId}-display-text` : undefined}
				>
					{displayText}
				</span>
				<ChevronDown
					className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
					data-testid={testId ? `${testId}-chevron` : undefined}
				/>
			</button>

			{isOpen && (
				<div
					className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
					data-testid={testId ? `${testId}-dropdown` : undefined}
				>
					{options.map((option) => (
						<button
							className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-gray-50"
							data-testid={
								testId
									? `${testId}-option-${option.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}`
									: undefined
							}
							key={option}
							onClick={() => {
								handleOptionToggle(option);
							}}
							type="button"
						>
							<div
								className={`mr-2 flex h-4 w-4 items-center justify-center rounded border ${
									value.includes(option) ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
								}`}
								data-testid={
									testId
										? `${testId}-option-checkbox-${option.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}`
										: undefined
								}
							>
								{value.includes(option) && <Check className="h-3 w-3 text-white" />}
							</div>
							<span
								className="text-gray-900"
								data-testid={
									testId
										? `${testId}-option-text-${option.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}`
										: undefined
								}
							>
								{option}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
