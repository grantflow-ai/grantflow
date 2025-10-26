"use client";

import Image from "next/image";
import { useCallback } from "react";
import { WizardLeftPane } from "@/components/organizations/project/applications/wizard/wizard-left-pane";
import { cn } from "@/lib/utils";
import { useApplicationStore } from "@/stores/application-store";
import type { API } from "@/types/api-types";

type GrantTypeValue = NonNullable<API.UpdateGrantTemplate.RequestBody["grant_type"]>;

const GRANT_TYPE_CARDS: {
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

export function GrantTypeStep() {
	const application = useApplicationStore((state) => state.application);
	const updateGrantType = useApplicationStore((state) => state.updateGrantType);
	const isSaving = useApplicationStore((state) => state.isSaving);

	const selectedType: GrantTypeValue = application?.grant_template?.grant_type ?? "RESEARCH";

	const handleSelect = useCallback(
		(value: GrantTypeValue) => {
			if (value === application?.grant_template?.grant_type) {
				return;
			}

			void updateGrantType(value);
		},
		[application?.grant_template?.grant_type, updateGrantType],
	);

	return (
		<div className="flex size-full flex-col items-stretch gap-6 2xl:flex-row 2xl:gap-8">
			<WizardLeftPane className="max-w-full">
				<div className="space-y-3 2xl:space-y-5">
					<div>
						<h2 className="font-heading text-2xl font-medium leading-loose text-stone-900">
							Application Type
						</h2>
						<p className="text-sm leading-none text-muted-foreground-dark">
							Select the focus of your proposal
						</p>
					</div>

					<div className="flex flex-col gap-4 md:flex-row">
						{GRANT_TYPE_CARDS.map((card) => (
							<GrantTypeCard
								description={card.description}
								disabled={isSaving}
								imageSrc={card.imageSrc}
								isSelected={selectedType === card.value}
								key={card.value}
								label={card.label}
								onSelect={() => {
									handleSelect(card.value);
								}}
							/>
						))}
					</div>
				</div>
			</WizardLeftPane>
		</div>
	);
}

function GrantTypeCard({
	description,
	disabled,
	imageSrc,
	isSelected,
	label,
	onSelect,
}: {
	description: string;
	disabled?: boolean;
	imageSrc: string;
	isSelected: boolean;
	label: string;
	onSelect: () => void;
}) {
	return (
		<button
			aria-pressed={isSelected}
			className={cn(
				"flex w-[377px] h-[438px] flex-col items-center justify-center gap-[21px] rounded-lg border bg-white px-[150px] py-[161px] transition-all",
				isSelected ? "border-primary shadow-lg shadow-primary/10" : "border-gray-200",
				disabled && "cursor-not-allowed opacity-60",
			)}
			data-testid={`grant-type-card-${label.replaceAll(/\s+/g, "-").toLowerCase()}`}
			disabled={disabled}
			onClick={onSelect}
			type="button"
		>
			<Image alt={`${label} illustration`} height={64} src={imageSrc} width={64} />
			<div className="text-center">
				<p className="font-heading text-lg font-semibold text-stone-900">{label}</p>
				<p className="mt-2 text-sm text-muted-foreground-dark">{description}</p>
			</div>
		</button>
	);
}
