"use client";

import { useEffect, useRef } from "react";
import { WizardClientComponent } from "@/components/organizations/project/applications/wizard/wizard-client";
import type { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { determineAppropriateStep, useWizardStore } from "@/stores/wizard-store";

export function ApplicationWizardPageClient() {
	useEffect(() => {
		return () => {
			useWizardStore.getState().reset();
			useApplicationStore.getState().reset();
		};
	}, []);

	const userSelectedStepRef = useRef<null | WizardStep>(null);

	const { project } = useProjectStore();
	const { selectedOrganizationId } = useOrganizationStore();

	const applicationId = useApplicationStore((state) => state.application?.id);

	useEffect(() => {
		if (!applicationId) return;

		useWizardStore.getState().reset();
		useApplicationStore.getState().softReset();

		if (userSelectedStepRef.current === null) {
			const appropriateStep = determineAppropriateStep(applicationId);

			if (appropriateStep === null) return;

			useWizardStore.setState({ currentStep: appropriateStep });
			userSelectedStepRef.current = appropriateStep;
		}

		return () => {
			userSelectedStepRef.current = null;
		};
	}, [applicationId]);

	if (!applicationId) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
				<div
					className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary"
					role="status"
				/>
				<p className="text-gray-600 font-medium">Loading application...</p>
			</div>
		);
	}

	if (!(project && selectedOrganizationId)) {
		return null;
	}

	return (
		<WizardClientComponent
			applicationId={applicationId}
			organizationId={selectedOrganizationId}
			projectId={project.id}
		/>
	);
}
