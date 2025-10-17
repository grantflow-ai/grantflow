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
				className={`flex w-full items-center cursor-pointer justify-between rounded-[4px] border border-primary px-3 py-2 text-left  bg-white `}
				data-testid={testId ? `${testId}-trigger` : undefined}
				onClick={() => {
					setIsOpen(!isOpen);
				}}
				type="button"
			>
				<span
					className={value.length > 0 ? "text-gray-900" : " font-sans font-normal text-base text-app-gray-400"}
					data-testid={testId ? `${testId}-display-text` : undefined}
				>
					{displayText}
				</span>
				<ChevronDown
					className={`h-4 w-4 text-app-gray-700 transition-transform  ${isOpen ? "rotate-180" : ""}`}
					data-testid={testId ? `${testId}-chevron` : undefined}
				/>
			</button>

			{isOpen && (
				<div
					className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[4px] border border-app-gray-100 bg-white p-1 "
					data-testid={testId ? `${testId}-dropdown` : undefined}
				>
					{options.map((option) => (
						<button
							className=" w-full hover:bg-primary items-center flex text-app-black rounded-[6px] cursor-pointer gap-1 hover:text-white p-3 text-left text-sm group"
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
								className={` flex h-3 w-3 items-center justify-center border ${
									value.includes(option) ? "border-blue-600 bg-blue-600" : "border-app-gray-700 group-hover:border-white bg-transparent"
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
								className="font-normal text-sm font-sora"
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
