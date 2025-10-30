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
		description: "Explores fundamental principles and biological mechanisms.",
		imageSrc: "/assets/research-grants.svg",
		label: "Basic Science",
		value: "RESEARCH",
	},
	{
		description: "Applies scientific findings toward clinical or practical use.",
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
				"p-8 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all",
				isSelected ? "border-2 border-primary" : "border-app-gray-100 hover:border hover:border-primary",
				disabled && "cursor-not-allowed opacity-60",
			)}
			data-testid={`grant-type-card-${option.label.replaceAll(/\s+/g, "-").toLowerCase()}`}
			disabled={disabled}
			onClick={onSelect}
			type="button"
		>
			<Image alt={`${option.label} illustration`} height={146} src={option.imageSrc} width={146} />
			<div className="text-center">
				<p className="font-cabin font-medium text-[28px] text-app-black">{option.label}</p>
				<p className="text-base font-normal font-sans text-app-gray-600">{option.description}</p>
			</div>
		</button>
	);
}
