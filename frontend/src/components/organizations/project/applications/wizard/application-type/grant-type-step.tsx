"use client";

import { useCallback } from "react";
import { WizardLeftPane } from "@/components/organizations/project/applications/wizard/wizard-left-pane";
import { useApplicationStore } from "@/stores/application-store";
import { GRANT_TYPE_OPTIONS, GrantTypeCard, type GrantTypeValue } from "./grant-type-options";

export function GrantTypeStep() {
	const application = useApplicationStore((state) => state.application);
	const updateGrantType = useApplicationStore((state) => state.updateGrantType);
	const isSaving = useApplicationStore((state) => state.isSaving);

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
						{GRANT_TYPE_OPTIONS.map((option) => (
							<GrantTypeCard
								disabled={isSaving}
								key={option.value}
								onSelect={() => {
									handleSelect(option.value);
								}}
								option={option}
							/>
						))}
					</div>
				</div>
			</WizardLeftPane>
		</div>
	);
}
