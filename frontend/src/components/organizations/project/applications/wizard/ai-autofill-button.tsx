"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface AiAutofillButtonProps {
	className?: string;
	isLoading?: boolean;
	onCancel: () => void;
	onClick: () => void;
}

export function AiAutofillButton({ className, isLoading, onCancel, onClick }: AiAutofillButtonProps) {
	const handleClick = () => {
		if (isLoading) {
			onCancel();
		} else {
			onClick();
		}
	};
	return (
		<div
			className={cn(
				"group items-center justify-center rounded-[40px] flex p-[1px] bg-[linear-gradient(to_right,#7068FF_0%,#433F99_99%)]",
				className,
			)}
		>
			<button
				className="w-max relative items-center rounded-[40px] flex gap-1 px-4 py-1 bg-[linear-gradient(to_left,#1E13F8_2%,#392FFA_20%,#4B42FC_42%,#635BFEB5_99%)] text-white shiny overflow-hidden transition-transform active:scale-95 cursor-pointer"
				onClick={handleClick}
				type="button"
			>
				<span>
					{isLoading ? (
						<div className="bg-white size-3 rounded-[2px]" />
					) : (
						<Image alt="Let the AI Try!" height={16} src="/icons/preview-logo.svg" width={16} />
					)}
				</span>
				{isLoading ? "Stop Generate" : "Let the AI Try!"}
			</button>
		</div>
	);
}
