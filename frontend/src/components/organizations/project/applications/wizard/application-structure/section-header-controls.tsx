"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { WizardBanner } from "@/components/organizations/project/applications/wizard/wizard-banner";
import { useApplicationStore } from "@/stores/application-store";
import type { GrantSection } from "@/types/grant-sections";
import { hasDetailedResearchPlan } from "@/types/grant-sections";

interface SectionHeaderControlsProps {
	onAddNewSection: () => Promise<void>;
}

export function SectionHeaderControls({ onAddNewSection }: SectionHeaderControlsProps) {
	const grantSections = useApplicationStore((state) => state.application?.grant_template?.grant_sections) ?? [];

	const [showResearchPlanError, setShowResearchPlanError] = useState(true);

	const hasResearchPlan = useMemo(() => {
		if (grantSections.length === 0) return true;

		return grantSections.some(
			(section: GrantSection) => hasDetailedResearchPlan(section) && section.is_detailed_research_plan === true,
		);
	}, [grantSections]);

	useEffect(() => {
		if (!hasResearchPlan) {
			setShowResearchPlanError(true);
		}
	}, [hasResearchPlan]);

	return (
		<div className="mb-2 flex justify-between items-start gap-2">
			{!hasResearchPlan && showResearchPlanError ? (
				<WizardBanner
					onClose={() => {
						setShowResearchPlanError(false);
					}}
					variant="error"
				>
					Research Plan is missing.
				</WizardBanner>
			) : (
				<div />
			)}
			<AppButton
				data-testid="add-new-section-button"
				leftIcon={<Plus />}
				onClick={onAddNewSection}
				size="sm"
				variant="secondary"
			>
				Add New Section
			</AppButton>
		</div>
	);
}
