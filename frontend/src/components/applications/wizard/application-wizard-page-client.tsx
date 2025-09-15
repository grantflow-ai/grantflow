"use client";

import { useEffect } from "react";
import { WizardClientComponent } from "@/components/organizations/project/applications/wizard/wizard-client";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useProjectStore } from "@/stores/project-store";
import { determineAppropriateStep, useWizardStore } from "@/stores/wizard-store";

export function ApplicationWizardPageClient() {
	const { project } = useProjectStore();
	const { selectedOrganizationId } = useOrganizationStore();

	const application = useApplicationStore((state) => state.application);

	useEffect(() => {
		if (!application) return;

		useWizardStore.getState().reset();
		useApplicationStore.getState().softReset();

		const appropriateStep = determineAppropriateStep(application);
		useWizardStore.setState({ currentStep: appropriateStep });

		const timeoutId = setTimeout(() => {
			void useApplicationStore.getState().checkAndRestoreJobState();
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			useWizardStore.getState().reset();
			useApplicationStore.getState().clearRestoredJobState();
		};
	}, [application]);

	if (!application) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
				<div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary" />
				<p className="text-gray-600 font-medium">Loading application...</p>
			</div>
		);
	}

	if (!(project && selectedOrganizationId)) {
		return null;
	}

	return (
		<WizardClientComponent
			application={application}
			organizationId={selectedOrganizationId}
			projectId={project.id}
		/>
	);
}
