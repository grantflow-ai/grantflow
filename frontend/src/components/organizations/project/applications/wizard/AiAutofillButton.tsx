"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface AiAutofillButtonProps {
	className?: string;
	disabled?: boolean;
	isLoading?: boolean;
	onClick: () => void;
}

export function AiAutofillButton({ className, disabled, isLoading, onClick }: AiAutofillButtonProps) {
	return (
		<div
			className={cn(
				"group items-center justify-center rounded-[40px] flex p-[1px] bg-[linear-gradient(to_right,#7068FF_0%,#433F99_99%)]",
				className,
				(disabled || isLoading) && "cursor-not-allowed opacity-50",
			)}
		>
			<button
				className="relative items-center rounded-[40px] flex gap-1 px-4 py-1 bg-[linear-gradient(to_left,#1E13F8_2%,#392FFA_20%,#4B42FC_42%,#635BFEB5_99%)] text-white shiny overflow-hidden transition-transform active:scale-95 cursor-pointer"
				disabled={disabled || isLoading}
				onClick={onClick}
				type="button"
			>
				<span>
					<Image alt="Let the AI Try!" height={16} src="/icons/preview-logo.svg" width={16} />
				</span>
				{isLoading ? "Generating..." : "Let the AI Try!"}
			</button>
		</div>
	);
}
