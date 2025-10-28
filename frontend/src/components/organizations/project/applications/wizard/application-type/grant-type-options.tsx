import Image from "next/image";
import { cn } from "@/lib/utils";
import type { API } from "@/types/api-types";

export type GrantTypeValue = NonNullable<API.UpdateGrantTemplate.RequestBody["grant_type"]>;

export const GRANT_TYPE_OPTIONS: {
	description: string;
	imageSrc: string;
	label: string;
	value: GrantTypeValue;
}[] = [
	{
		description: "Placeholder description for foundational discovery work.",
		imageSrc: "/assets/research-grants.svg",
		label: "Basic Science",
		value: "RESEARCH",
	},
	{
		description: "Placeholder description for translational-focused work.",
		imageSrc: "/assets/translational-grants.svg",
		label: "Translational Research",
		value: "TRANSLATIONAL",
	},
];

interface GrantTypeCardProps {
	disabled?: boolean;
	isSelected: boolean;
	onSelect: () => void;
	option: (typeof GRANT_TYPE_OPTIONS)[number];
}

export function GrantTypeCard({ disabled, isSelected, onSelect, option }: GrantTypeCardProps) {
	return (
		<button
			aria-pressed={isSelected}
			className={cn(
				"flex w-[377px] h-[438px] flex-col items-center justify-center gap-[21px] rounded-lg border bg-white px-[150px] py-[161px] transition-all",
				isSelected ? "border-primary shadow-lg shadow-primary/10" : "border-gray-200",
				disabled && "cursor-not-allowed opacity-60",
			)}
			data-testid={`grant-type-card-${option.label.replaceAll(/\s+/g, "-").toLowerCase()}`}
			disabled={disabled}
			onClick={onSelect}
			type="button"
		>
			<Image alt={`${option.label} illustration`} height={64} src={option.imageSrc} width={64} />
			<div className="text-center">
				<p className="font-heading text-lg font-semibold text-stone-900">{option.label}</p>
				<p className="mt-2 text-sm text-muted-foreground-dark">{option.description}</p>
			</div>
		</button>
	);
}
